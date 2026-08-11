import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  ConversationStatus,
  ListingStatus,
  ListingType,
  MessageType,
} from '../generated/prisma/enums';
import { ConversationsService } from './conversations.service';

const now = new Date('2026-08-11T00:50:00.000Z');

const conversationRow = {
  id: 'conversation-id',
  status: ConversationStatus.ACTIVE,
  lastMessageAt: null,
  createdAt: now,
  updatedAt: now,
  listing: {
    id: 'listing-id',
    title: 'Room in Dublin 8',
    status: ListingStatus.ACTIVE,
  },
  participantA: {
    id: 'advertiser-id',
    profile: {
      displayName: 'Advertiser',
      profilePhotoUrl: null,
    },
  },
  participantB: {
    id: 'seeker-id',
    profile: {
      displayName: 'Seeker',
      profilePhotoUrl: null,
    },
  },
};

describe('ConversationsService', () => {
  const userFindFirst = jest.fn();
  const listingFindUnique = jest.fn();
  const lifecycleFindUnique = jest.fn();
  const conversationFindUnique = jest.fn();
  const conversationFindFirst = jest.fn();
  const conversationFindMany = jest.fn();
  const conversationUpsert = jest.fn();
  const conversationUpdate = jest.fn();
  const messageFindFirst = jest.fn();
  const messageFindMany = jest.fn();
  const messageCreate = jest.fn();
  const transaction = jest.fn();

  const database = {
    user: { findFirst: userFindFirst },
    listing: { findUnique: listingFindUnique },
    listingLifecycle: { findUnique: lifecycleFindUnique },
    conversation: {
      findUnique: conversationFindUnique,
      findFirst: conversationFindFirst,
      findMany: conversationFindMany,
      upsert: conversationUpsert,
      update: conversationUpdate,
    },
    message: {
      findFirst: messageFindFirst,
      findMany: messageFindMany,
      create: messageCreate,
    },
    $transaction: transaction,
  };

  const service = new ConversationsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    userFindFirst.mockResolvedValue({ id: 'active-user' });
    listingFindUnique.mockResolvedValue({
      id: 'listing-id',
      userId: 'advertiser-id',
      status: ListingStatus.ACTIVE,
      type: ListingType.RENTAL,
      deletedAt: null,
    });
    lifecycleFindUnique.mockResolvedValue({
      expiresAt: new Date('2026-08-20T00:00:00.000Z'),
    });
    conversationFindUnique.mockResolvedValue(null);
    conversationFindFirst.mockResolvedValue({ id: 'conversation-id' });
    conversationFindMany.mockResolvedValue([conversationRow]);
    conversationUpsert.mockResolvedValue(conversationRow);
    messageFindMany.mockResolvedValue([]);
    messageCreate.mockResolvedValue({
      id: 'message-id',
      senderId: 'seeker-id',
      type: MessageType.TEXT,
      body: 'Hello',
      readAt: null,
      createdAt: now,
    });
    conversationUpdate.mockResolvedValue({ id: 'conversation-id' });
    transaction.mockImplementation((callback) => callback(database));
  });

  it('derives the advertiser from listing ownership when creating a conversation', async () => {
    await service.startOrGet('seeker-id', 'listing-id', now);

    expect(conversationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          listingId_participantAId_participantBId: {
            listingId: 'listing-id',
            participantAId: 'advertiser-id',
            participantBId: 'seeker-id',
          },
        },
        create: {
          listingId: 'listing-id',
          participantAId: 'advertiser-id',
          participantBId: 'seeker-id',
        },
      }),
    );
  });

  it('rejects self-conversations', async () => {
    listingFindUnique.mockResolvedValue({
      id: 'listing-id',
      userId: 'seeker-id',
      status: ListingStatus.ACTIVE,
      type: ListingType.RENTAL,
      deletedAt: null,
    });

    await expect(
      service.startOrGet('seeker-id', 'listing-id', now),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(conversationUpsert).not.toHaveBeenCalled();
  });

  it('returns an existing conversation before re-checking listing expiry', async () => {
    listingFindUnique.mockResolvedValue({
      id: 'listing-id',
      userId: 'advertiser-id',
      status: ListingStatus.CLOSED,
      type: ListingType.RENTAL,
      deletedAt: null,
    });
    conversationFindUnique.mockResolvedValue(conversationRow);

    await expect(
      service.startOrGet('seeker-id', 'listing-id', now),
    ).resolves.toEqual(conversationRow);
    expect(lifecycleFindUnique).not.toHaveBeenCalled();
    expect(conversationUpsert).not.toHaveBeenCalled();
  });

  it('rejects a new conversation for expired inventory', async () => {
    lifecycleFindUnique.mockResolvedValue({ expiresAt: now });

    await expect(
      service.startOrGet('seeker-id', 'listing-id', now),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(conversationUpsert).not.toHaveBeenCalled();
  });

  it('hides conversations from non-participants', async () => {
    conversationFindFirst.mockResolvedValue(null);

    await expect(
      service.get('other-user', 'conversation-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes a message cursor to the requested conversation', async () => {
    messageFindFirst.mockResolvedValue(null);

    await expect(
      service.listMessages('seeker-id', 'conversation-id', {
        cursor: 'foreign-message',
        limit: 20,
      }),
    ).rejects.toThrow('Message cursor not found.');
    expect(messageFindMany).not.toHaveBeenCalled();
  });

  it('creates a trimmed text message and updates lastMessageAt atomically', async () => {
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      status: ConversationStatus.ACTIVE,
    });

    await service.sendText('seeker-id', 'conversation-id', '  Hello  ', now);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conversation-id',
          senderId: 'seeker-id',
          type: MessageType.TEXT,
          body: 'Hello',
          createdAt: now,
        }),
      }),
    );
    expect(conversationUpdate).toHaveBeenCalledWith({
      where: { id: 'conversation-id' },
      data: { lastMessageAt: now },
      select: { id: true },
    });
  });

  it('does not send when the conversation is not active', async () => {
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      status: ConversationStatus.BLOCKED,
    });

    await expect(
      service.sendText('seeker-id', 'conversation-id', 'Hello', now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(messageCreate).not.toHaveBeenCalled();
  });
});
