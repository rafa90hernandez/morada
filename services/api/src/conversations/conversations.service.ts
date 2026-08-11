import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  ConversationStatus,
  ListingStatus,
  ListingType,
  MessageType,
  UserStatus,
} from '../generated/prisma/enums';
import { ConversationPageQueryDto } from './dto/conversation-page-query.dto';

const conversationSelect = {
  id: true,
  status: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  participantA: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          profilePhotoUrl: true,
        },
      },
    },
  },
  participantB: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          profilePhotoUrl: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class ConversationsService {
  constructor(private readonly database: DatabaseService) {}

  async startOrGet(userId: string, listingId: string, now = new Date()) {
    await this.assertActiveUser(userId);

    const listing = await this.database.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        userId: true,
        status: true,
        type: true,
        deletedAt: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    if (listing.userId === userId) {
      throw new BadRequestException(
        'You cannot start a conversation with your own listing.',
      );
    }

    const existing = await this.database.conversation.findUnique({
      where: {
        listingId_participantAId_participantBId: {
          listingId,
          participantAId: listing.userId,
          participantBId: userId,
        },
      },
      select: conversationSelect,
    });

    if (existing) {
      return existing;
    }

    await this.assertListingContactEligible(listing, now);
    await this.assertActiveAdvertiser(listing.userId);

    return this.database.conversation.upsert({
      where: {
        listingId_participantAId_participantBId: {
          listingId,
          participantAId: listing.userId,
          participantBId: userId,
        },
      },
      create: {
        listingId,
        participantAId: listing.userId,
        participantBId: userId,
      },
      update: {},
      select: conversationSelect,
    });
  }

  async list(userId: string, query: ConversationPageQueryDto) {
    await this.assertActiveUser(userId);

    if (query.cursor) {
      await this.assertConversationParticipant(userId, query.cursor);
    }

    const rows = await this.database.conversation.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      select: conversationSelect,
    });

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    };
  }

  async get(userId: string, conversationId: string) {
    await this.assertActiveUser(userId);

    const conversation = await this.database.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      select: conversationSelect,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  async listMessages(
    userId: string,
    conversationId: string,
    query: ConversationPageQueryDto,
  ) {
    await this.assertActiveUser(userId);
    await this.assertConversationParticipant(userId, conversationId);

    if (query.cursor) {
      const cursorMessage = await this.database.message.findFirst({
        where: {
          id: query.cursor,
          conversationId,
        },
        select: { id: true },
      });

      if (!cursorMessage) {
        throw new NotFoundException('Message cursor not found.');
      }
    }

    const rows = await this.database.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        senderId: true,
        type: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    };
  }

  async sendText(
    userId: string,
    conversationId: string,
    rawBody: string,
    now = new Date(),
  ) {
    await this.assertActiveUser(userId);
    const body = this.normalizeBody(rawBody);

    return this.database.$transaction(async (transaction) => {
      const conversation = await transaction.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ participantAId: userId }, { participantBId: userId }],
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found.');
      }

      if (conversation.status !== ConversationStatus.ACTIVE) {
        throw new ForbiddenException('Conversation is not currently sendable.');
      }

      const message = await transaction.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: MessageType.TEXT,
          body,
          createdAt: now,
        },
        select: {
          id: true,
          senderId: true,
          type: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
      });

      await transaction.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
        select: { id: true },
      });

      return message;
    });
  }

  private async assertActiveUser(userId: string): Promise<void> {
    const user = await this.database.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException('Active account required.');
    }
  }

  private async assertActiveAdvertiser(userId: string): Promise<void> {
    const advertiser = await this.database.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!advertiser) {
      throw new NotFoundException('Listing not found.');
    }
  }

  private async assertConversationParticipant(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.database.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }
  }

  private async assertListingContactEligible(
    listing: {
      id: string;
      status: ListingStatus;
      type: ListingType;
      deletedAt: Date | null;
    },
    now: Date,
  ): Promise<void> {
    if (
      listing.status !== ListingStatus.ACTIVE ||
      listing.deletedAt ||
      ![ListingType.RENTAL, ListingType.TRANSFER].includes(listing.type)
    ) {
      throw new NotFoundException('Listing not found.');
    }

    const lifecycle = await this.database.listingLifecycle.findUnique({
      where: { listingId: listing.id },
      select: { expiresAt: true },
    });

    if (
      !lifecycle?.expiresAt ||
      lifecycle.expiresAt.getTime() <= now.getTime()
    ) {
      throw new NotFoundException('Listing not found.');
    }
  }

  private normalizeBody(rawBody: string): string {
    const body = rawBody.trim();

    if (!body) {
      throw new BadRequestException('Message body is required.');
    }

    if (body.length > 2000) {
      throw new BadRequestException(
        'Message body cannot exceed 2000 characters.',
      );
    }

    return body;
  }
}
