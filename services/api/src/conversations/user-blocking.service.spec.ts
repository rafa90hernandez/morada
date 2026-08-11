import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { UserBlockingService } from './user-blocking.service';

const createdAt = new Date('2026-08-11T02:00:00.000Z');

describe('UserBlockingService', () => {
  const userFindFirst = jest.fn();
  const userFindUnique = jest.fn();
  const blockUpsert = jest.fn();
  const blockDeleteMany = jest.fn();
  const blockFindMany = jest.fn();
  const blockFindFirst = jest.fn();

  const database = {
    user: {
      findFirst: userFindFirst,
      findUnique: userFindUnique,
    },
    block: {
      upsert: blockUpsert,
      deleteMany: blockDeleteMany,
      findMany: blockFindMany,
      findFirst: blockFindFirst,
    },
  };

  const service = new UserBlockingService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    userFindFirst.mockResolvedValue({ id: 'blocker-id' });
    userFindUnique.mockResolvedValue({ id: 'blocked-id' });
    blockUpsert.mockResolvedValue({
      blockedId: 'blocked-id',
      createdAt,
    });
    blockDeleteMany.mockResolvedValue({ count: 1 });
    blockFindMany.mockResolvedValue([]);
    blockFindFirst.mockResolvedValue(null);
  });

  it('prevents self-blocking', async () => {
    await expect(service.block('same-user', 'same-user')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(blockUpsert).not.toHaveBeenCalled();
  });

  it('requires the blocking account to be active', async () => {
    userFindFirst.mockResolvedValue(null);

    await expect(
      service.block('blocker-id', 'blocked-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(blockUpsert).not.toHaveBeenCalled();
  });

  it('does not create a block for a missing target user', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(
      service.block('blocker-id', 'missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(blockUpsert).not.toHaveBeenCalled();
  });

  it('creates a block idempotently with the authenticated user as blocker', async () => {
    await expect(service.block('blocker-id', 'blocked-id')).resolves.toEqual({
      blockedUserId: 'blocked-id',
      blocked: true,
      createdAt,
    });

    expect(blockUpsert).toHaveBeenCalledWith({
      where: {
        blockerId_blockedId: {
          blockerId: 'blocker-id',
          blockedId: 'blocked-id',
        },
      },
      create: {
        blockerId: 'blocker-id',
        blockedId: 'blocked-id',
      },
      update: {},
      select: {
        blockedId: true,
        createdAt: true,
      },
    });
  });

  it('unblocks only a relationship created by the authenticated blocker', async () => {
    await expect(service.unblock('blocker-id', 'blocked-id')).resolves.toEqual({
      blockedUserId: 'blocked-id',
      blocked: false,
    });

    expect(blockDeleteMany).toHaveBeenCalledWith({
      where: {
        blockerId: 'blocker-id',
        blockedId: 'blocked-id',
      },
    });
  });

  it('lists only blocks created by the authenticated user', async () => {
    await service.list('blocker-id');

    expect(blockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { blockerId: 'blocker-id' } }),
    );
  });

  it.each([
    ['blocker -> blocked', 'user-a', 'user-b'],
    ['blocked -> blocker', 'user-b', 'user-a'],
  ])('rejects direct contact for either block direction: %s', async () => {
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.assertNoBlockBetween('user-a', 'user-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(blockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: 'user-a', blockedId: 'user-b' },
          { blockerId: 'user-b', blockedId: 'user-a' },
        ],
      },
      select: { id: true },
    });
  });
});
