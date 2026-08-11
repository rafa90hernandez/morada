import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { NotificationPageQueryDto } from './dto/notification-page-query.dto';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  isRead: true,
  targetType: true,
  targetId: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: string, query: NotificationPageQueryDto) {
    if (query.cursor) {
      const cursor = await this.database.inAppNotification.findFirst({
        where: { id: query.cursor, userId },
        select: { id: true },
      });

      if (!cursor) {
        throw new NotFoundException('Notification cursor not found.');
      }
    }

    const rows = await this.database.inAppNotification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      select: notificationSelect,
    });

    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const items = await Promise.all(
      page.map((notification) => this.sanitizeTarget(userId, notification)),
    );

    return {
      items,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.database.inAppNotification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  async markRead(userId: string, notificationId: string, now = new Date()) {
    const notification = await this.database.inAppNotification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, isRead: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (notification.isRead) {
      return this.database.inAppNotification.findFirst({
        where: { id: notificationId, userId },
        select: notificationSelect,
      });
    }

    return this.database.inAppNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: now },
      select: notificationSelect,
    });
  }

  async markAllRead(userId: string, now = new Date()) {
    const result = await this.database.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: now },
    });

    return { updated: result.count };
  }

  private async sanitizeTarget(
    userId: string,
    notification: {
      id: string;
      type: unknown;
      title: string;
      body: string;
      isRead: boolean;
      targetType: string | null;
      targetId: string | null;
      metadata: unknown;
      readAt: Date | null;
      createdAt: Date;
    },
  ) {
    const accessible = await this.canAccessTarget(
      userId,
      notification.targetType,
      notification.targetId,
    );

    if (accessible) {
      return notification;
    }

    return {
      ...notification,
      targetType: null,
      targetId: null,
      metadata: null,
    };
  }

  private async canAccessTarget(
    userId: string,
    targetType: string | null,
    targetId: string | null,
  ): Promise<boolean> {
    if (!targetType || !targetId) {
      return true;
    }

    switch (targetType) {
      case 'CONVERSATION':
        return Boolean(
          await this.database.conversation.findFirst({
            where: {
              id: targetId,
              OR: [{ participantAId: userId }, { participantBId: userId }],
            },
            select: { id: true },
          }),
        );
      case 'VISIT':
        return Boolean(
          await this.database.visit.findFirst({
            where: {
              id: targetId,
              OR: [{ requesterId: userId }, { responderId: userId }],
            },
            select: { id: true },
          }),
        );
      case 'LISTING':
        return this.canAccessListingTarget(userId, targetId);
      case 'REPORT':
        return Boolean(
          await this.database.report.findFirst({
            where: { id: targetId, reporterId: userId },
            select: { id: true },
          }),
        );
      default:
        return false;
    }
  }

  private async canAccessListingTarget(
    userId: string,
    listingId: string,
    now = new Date(),
  ): Promise<boolean> {
    const listing = await this.database.listing.findFirst({
      where: { id: listingId },
      select: {
        id: true,
        userId: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!listing) {
      return false;
    }

    if (listing.userId === userId) {
      return true;
    }

    if (listing.status !== 'ACTIVE' || listing.deletedAt) {
      return false;
    }

    const lifecycle = await this.database.listingLifecycle.findUnique({
      where: { listingId },
      select: { expiresAt: true },
    });

    return Boolean(
      lifecycle?.expiresAt && lifecycle.expiresAt.getTime() > now.getTime(),
    );
  }
}
