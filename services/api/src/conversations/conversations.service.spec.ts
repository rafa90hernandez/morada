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
  const blockFindFirst = jest.fn();
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
    block: { findFirst: blockFindFirst },
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
    blockFindFirst.mockResolvedValue(null);
    conversationUpdate.mockResolvedValue({ id: 'conversation-id' });
    transaction.mockImplementation((callback) => callback(database));
  });

  it('derives the advertiser from listing ownership when creating a conversation', async () => {
    await service.startOrGet('seeker-id', 'listing-id', now);

    expect(conversationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
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

  it('returns existing history with an effective blocked status when contact is blocked', async () => {
    conversationFindUnique.mockResolvedValue(conversationRow);
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.startOrGet('seeker-id', 'listing-id', now),
    ).resolves.toEqual({
      ...conversationRow,
      status: ConversationStatus.BLOCKED,
    });
    expect(blockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: 'advertiser-id', blockedId: 'seeker-id' },
          { blockerId: 'seeker-id', blockedId: 'advertiser-id' },
        ],
      },
      select: { id: true },
    });
  });

  it('returns effective blocked status in the conversation list without exposing block direction', async () => {
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.list('seeker-id', { limit: 20 }),
    ).resolves.toEqual({
      items: [
        {
          ...conversationRow,
          status: ConversationStatus.BLOCKED,
        },
      ],
      nextCursor: null,
    });
  });

  it('rejects a new conversation when either user has blocked the other', async () => {
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.startOrGet('seeker-id', 'listing-id', now),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(blockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: 'seeker-id', blockedId: 'advertiser-id' },
          { blockerId: 'advertiser-id', blockedId: 'seeker-id' },
        ],
      },
      select: { id: true },
    });
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

  it('keeps message history readable while blocked', async () => {
    conversationFindFirst.mockResolvedValue({ id: 'conversation-id' });
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.listMessages('seeker-id', 'conversation-id', { limit: 20 }),
    ).resolves.toEqual({ items: [], nextCursor: null });
    expect(blockFindFirst).not.toHaveBeenCalled();
  });

  it('creates a trimmed text message and updates lastMessageAt atomically', async () => {
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      status: ConversationStatus.ACTIVE,
      participantAId: 'advertiser-id',
      participantBId: 'seeker-id',
    });

    await service.sendText('seeker-id', 'conversation-id', '  Hello  ', now);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: 'Hello',
          createdAt: now,
        }),
      }),
    );
    expect(conversationUpdate).toHaveBeenCalled();
  });

  it('does not send text when either participant has blocked the other', async () => {
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      status: ConversationStatus.ACTIVE,
      participantAId: 'advertiser-id',
      participantBId: 'seeker-id',
    });
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.sendText('seeker-id', 'conversation-id', 'Hello', now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it('does not send when the conversation is not active', async () => {
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      status: ConversationStatus.BLOCKED,
      participantAId: 'advertiser-id',
      participantBId: 'seeker-id',
    });

    await expect(
      service.sendText('seeker-id', 'conversation-id', 'Hello', now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(messageCreate).not.toHaveBeenCalled();
  });
});
