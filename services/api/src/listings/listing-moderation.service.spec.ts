import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

jest.mock('../common/mappers/listing.mapper', () => ({
  ListingMapper: {
    toOwnerResponse: jest.fn((listing) => listing),
  },
}));

import { ListingStatus } from '../generated/prisma/enums';
import { ListingModerationService } from './listing-moderation.service';

describe('ListingModerationService', () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const createAdminAction = jest.fn();

  const transaction = {
    listing: {
      findFirst,
      update,
    },
    adminActionLog: {
      create: createAdminAction,
    },
  };

  const $transaction = jest.fn(
    async (
      callback: (client: typeof transaction) => Promise<unknown>,
    ): Promise<unknown> => callback(transaction),
  );

  const service = new ListingModerationService({ $transaction } as never);

  const pendingListing = {
    id: 'listing-id',
    status: ListingStatus.PENDING_REVIEW,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('approves only a pending listing and records the admin action', async () => {
    findFirst.mockResolvedValue(pendingListing);
    update.mockResolvedValue({
      ...pendingListing,
      status: ListingStatus.ACTIVE,
      rejectionReason: null,
      pausedReason: null,
      publishedAt: new Date(),
    });
    createAdminAction.mockResolvedValue({ id: 'audit-id' });

    await service.approve('admin-id', 'listing-id');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-id' },
        data: {
          status: ListingStatus.ACTIVE,
          rejectionReason: null,
          pausedReason: null,
          publishedAt: expect.any(Date),
        },
      }),
    );
    expect(createAdminAction).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-id',
        action: 'LISTING_APPROVED',
        targetType: 'LISTING',
        targetId: 'listing-id',
        metadata: {
          previousStatus: ListingStatus.PENDING_REVIEW,
        },
      },
    });
  });

  it('rejects a pending listing, normalizes the reason and records the admin action', async () => {
    findFirst.mockResolvedValue(pendingListing);
    update.mockResolvedValue({
      ...pendingListing,
      status: ListingStatus.REJECTED,
      rejectionReason: 'Missing authorization evidence.',
    });
    createAdminAction.mockResolvedValue({ id: 'audit-id' });

    await service.reject(
      'admin-id',
      'listing-id',
      '  Missing authorization evidence.  ',
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: ListingStatus.REJECTED,
          rejectionReason: 'Missing authorization evidence.',
          pausedReason: null,
          publishedAt: null,
        },
      }),
    );
    expect(createAdminAction).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-id',
        action: 'LISTING_REJECTED',
        targetType: 'LISTING',
        targetId: 'listing-id',
        reason: 'Missing authorization evidence.',
        metadata: {
          previousStatus: ListingStatus.PENDING_REVIEW,
        },
      },
    });
  });

  it('rejects approval when the listing does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.approve('admin-id', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
    expect(createAdminAction).not.toHaveBeenCalled();
  });

  it('rejects moderation when the listing is not pending review', async () => {
    findFirst.mockResolvedValue({
      ...pendingListing,
      status: ListingStatus.ACTIVE,
    });

    await expect(
      service.approve('admin-id', 'listing-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.reject('admin-id', 'listing-id', 'Reason'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
    expect(createAdminAction).not.toHaveBeenCalled();
  });

  it('rejects a blank rejection reason before starting a transaction', async () => {
    await expect(
      service.reject('admin-id', 'listing-id', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect($transaction).not.toHaveBeenCalled();
  });
});
