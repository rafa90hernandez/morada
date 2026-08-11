import { NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { NotificationsService } from './notifications.service';

const now = new Date('2026-08-11T04:30:00.000Z');

const notificationRow = {
  id: 'notification-id',
  type: 'NEW_MESSAGE',
  title: 'New message',
  body: 'You have a new message.',
  isRead: false,
  targetType: 'CONVERSATION',
  targetId: 'conversation-id',
  metadata: { messageId: 'message-id' },
  readAt: null,
  createdAt: now,
};

describe('NotificationsService', () => {
  const notificationFindFirst = jest.fn();
  const notificationFindMany = jest.fn();
  const notificationCount = jest.fn();
  const notificationUpdate = jest.fn();
  const notificationUpdateMany = jest.fn();
  const conversationFindFirst = jest.fn();
  const visitFindFirst = jest.fn();
  const listingFindFirst = jest.fn();
  const lifecycleFindUnique = jest.fn();
  const reportFindFirst = jest.fn();

  const database = {
    inAppNotification: {
      findFirst: notificationFindFirst,
      findMany: notificationFindMany,
      count: notificationCount,
      update: notificationUpdate,
      updateMany: notificationUpdateMany,
    },
    conversation: { findFirst: conversationFindFirst },
    visit: { findFirst: visitFindFirst },
    listing: { findFirst: listingFindFirst },
    listingLifecycle: { findUnique: lifecycleFindUnique },
    report: { findFirst: reportFindFirst },
  };

  const service = new NotificationsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    notificationFindFirst.mockResolvedValue(notificationRow);
    notificationFindMany.mockResolvedValue([notificationRow]);
    notificationCount.mockResolvedValue(3);
    notificationUpdate.mockResolvedValue({
      ...notificationRow,
      isRead: true,
      readAt: now,
    });
    notificationUpdateMany.mockResolvedValue({ count: 2 });
    conversationFindFirst.mockResolvedValue({ id: 'conversation-id' });
    visitFindFirst.mockResolvedValue({ id: 'visit-id' });
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      userId: 'owner-id',
      status: 'ACTIVE',
      deletedAt: null,
    });
    lifecycleFindUnique.mockResolvedValue({
      expiresAt: new Date('2026-08-20T00:00:00.000Z'),
    });
    reportFindFirst.mockResolvedValue({ id: 'report-id' });
  });

  it('lists only notifications owned by the authenticated user with deterministic pagination', async () => {
    const result = await service.list('user-id', { limit: 20 });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-id' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
      }),
    );
    expect(result.items).toHaveLength(1);
  });

  it('rejects a pagination cursor owned by another user', async () => {
    notificationFindFirst.mockResolvedValue(null);

    await expect(
      service.list('user-id', { cursor: 'foreign-id', limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an unread count scoped to the authenticated user', async () => {
    await expect(service.unreadCount('user-id')).resolves.toEqual({ count: 3 });
    expect(notificationCount).toHaveBeenCalledWith({
      where: { userId: 'user-id', isRead: false },
    });
  });

  it('marks only an owned notification as read', async () => {
    await service.markRead('user-id', 'notification-id', now);

    expect(notificationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notification-id', userId: 'user-id' },
      }),
    );
    expect(notificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notification-id' },
        data: { isRead: true, readAt: now },
      }),
    );
  });

  it('marks all unread notifications for one user without touching other users', async () => {
    await expect(service.markAllRead('user-id', now)).resolves.toEqual({
      updated: 2,
    });
    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', isRead: false },
      data: { isRead: true, readAt: now },
    });
  });

  it('strips navigation target and metadata when target access is no longer valid', async () => {
    conversationFindFirst.mockResolvedValue(null);

    const result = await service.list('user-id', { limit: 20 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        targetType: null,
        targetId: null,
        metadata: null,
      }),
    );
  });

  it('strips an expired public listing target for a non-owner', async () => {
    notificationFindMany.mockResolvedValue([
      {
        ...notificationRow,
        targetType: 'LISTING',
        targetId: 'listing-id',
        metadata: null,
      },
    ]);
    lifecycleFindUnique.mockResolvedValue({ expiresAt: now });

    const result = await service.list('user-id', { limit: 20 });

    expect(lifecycleFindUnique).toHaveBeenCalledWith({
      where: { listingId: 'listing-id' },
      select: { expiresAt: true },
    });
    expect(result.items[0].targetId).toBeNull();
  });

  it('preserves an owner listing target without requiring public lifecycle eligibility', async () => {
    notificationFindMany.mockResolvedValue([
      {
        ...notificationRow,
        targetType: 'LISTING',
        targetId: 'listing-id',
        metadata: null,
      },
    ]);
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      userId: 'owner-id',
      status: 'PAUSED',
      deletedAt: null,
    });

    const result = await service.list('owner-id', { limit: 20 });

    expect(result.items[0].targetId).toBe('listing-id');
    expect(lifecycleFindUnique).not.toHaveBeenCalled();
  });

  it('never resolves report targets for anyone except the original reporter', async () => {
    notificationFindMany.mockResolvedValue([
      {
        ...notificationRow,
        targetType: 'REPORT',
        targetId: 'report-id',
        metadata: null,
      },
    ]);
    reportFindFirst.mockResolvedValue(null);

    const result = await service.list('other-user', { limit: 20 });

    expect(reportFindFirst).toHaveBeenCalledWith({
      where: { id: 'report-id', reporterId: 'other-user' },
      select: { id: true },
    });
    expect(result.items[0].targetId).toBeNull();
  });
});
