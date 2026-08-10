import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

jest.mock('./listings.service', () => ({
  ListingsService: class ListingsService {},
}));

import {
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingCloseReason,
  ListingStatus,
  UserStatus,
} from '../generated/prisma/enums';
import {
  LISTING_VALIDITY_DAYS,
  ListingLifecycleService,
  addDays,
} from './listing-lifecycle.service';

const now = new Date('2026-08-10T15:00:00.000Z');

const renewableListing = {
  id: 'listing-id',
  status: ListingStatus.ACTIVE,
  createdAt: new Date('2026-07-01T10:00:00.000Z'),
  publishedAt: new Date('2026-07-15T10:00:00.000Z'),
  landlordApprovalRequired: false,
  privateLocation: { id: 'private-location' },
  publicLocation: { id: 'public-location' },
  photos: [{ id: 'photo-id' }],
  user: {
    status: UserStatus.ACTIVE,
    verification: {
      identitySubmissions: [
        {
          status: IdentityVerificationStatus.APPROVED,
        },
      ],
    },
  },
  authorizationSubmissions: [
    {
      status: ListingAuthorizationStatus.APPROVED,
      relationshipVerified: true,
      landlordAuthorizationVerified: false,
    },
  ],
};

describe('ListingLifecycleService', () => {
  const lifecycleFindUnique = jest.fn();
  const lifecycleUpsert = jest.fn();
  const lifecycleFindMany = jest.fn();
  const listingFindFirst = jest.fn();
  const listingFindMany = jest.fn();
  const listingUpdate = jest.fn();
  const transactionLifecycleUpsert = jest.fn();

  const transactionClient = {
    listing: {
      update: listingUpdate,
    },
    listingLifecycle: {
      upsert: transactionLifecycleUpsert,
    },
  };

  const $transaction = jest.fn(
    async (
      callback: (client: typeof transactionClient) => Promise<unknown>,
    ): Promise<unknown> => callback(transactionClient),
  );

  const database = {
    listingLifecycle: {
      findUnique: lifecycleFindUnique,
      upsert: lifecycleUpsert,
      findMany: lifecycleFindMany,
    },
    listing: {
      findFirst: listingFindFirst,
      findMany: listingFindMany,
    },
    $transaction,
  };

  const findPublicById = jest.fn();
  const findMineById = jest.fn();
  const listingsService = {
    findPublicById,
    findMineById,
  };

  const service = new ListingLifecycleService(
    database as never,
    listingsService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    listingFindFirst.mockResolvedValue(renewableListing);
    findMineById.mockResolvedValue({
      id: 'listing-id',
      createdAt: renewableListing.createdAt,
      publishedAt: renewableListing.publishedAt,
    });
    lifecycleUpsert.mockResolvedValue({
      expiresAt: addDays(now, LISTING_VALIDITY_DAYS),
      lastRenewedAt: now,
    });
    listingUpdate.mockResolvedValue({ id: 'listing-id' });
    transactionLifecycleUpsert.mockResolvedValue({
      expiresAt: new Date('2026-08-20T10:00:00.000Z'),
      lastRenewedAt: null,
      closeReason: ListingCloseReason.RENTED_VIA_MORADA,
      closeReasonDetail: null,
    });
  });

  it('returns a listing publicly only before the exact expiry boundary', async () => {
    lifecycleFindUnique.mockResolvedValue({
      expiresAt: new Date('2026-08-10T15:00:00.001Z'),
    });
    findPublicById.mockResolvedValue({ id: 'listing-id' });

    await expect(service.findPublicById('listing-id', now)).resolves.toEqual({
      id: 'listing-id',
    });

    expect(findPublicById).toHaveBeenCalledWith('listing-id');
  });

  it.each([
    [null],
    [{ expiresAt: null }],
    [{ expiresAt: new Date('2026-08-10T14:59:59.999Z') }],
    [{ expiresAt: new Date('2026-08-10T15:00:00.000Z') }],
  ])('hides missing or expired lifecycle metadata from public reads', async (value) => {
    lifecycleFindUnique.mockResolvedValue(value);

    await expect(service.findPublicById('listing-id', now)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(findPublicById).not.toHaveBeenCalled();
  });

  it('renews an eligible listing for 45 days without mutating listing recency fields', async () => {
    const result = await service.renew('user-id', 'listing-id', now);

    expect(lifecycleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listingId: 'listing-id' },
        update: expect.objectContaining({
          expiresAt: new Date('2026-09-24T15:00:00.000Z'),
          lastRenewedAt: now,
        }),
      }),
    );
    expect(listingUpdate).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        createdAt: renewableListing.createdAt,
        publishedAt: renewableListing.publishedAt,
        lifecycle: expect.objectContaining({ lastRenewedAt: now }),
      }),
    );
  });

  it('does not let a review-required listing bypass moderation through renewal', async () => {
    listingFindFirst.mockResolvedValue({
      ...renewableListing,
      status: ListingStatus.PENDING_REVIEW,
    });

    await expect(
      service.renew('user-id', 'listing-id', now),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(lifecycleUpsert).not.toHaveBeenCalled();
  });

  it('revalidates landlord authorization when the listing requires it', async () => {
    listingFindFirst.mockResolvedValue({
      ...renewableListing,
      landlordApprovalRequired: true,
    });

    await expect(
      service.renew('user-id', 'listing-id', now),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('closes a listing with a structured reason in the same transaction', async () => {
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      status: ListingStatus.ACTIVE,
    });

    const result = await service.close('user-id', 'listing-id', {
      reason: ListingCloseReason.RENTED_VIA_MORADA,
      detail: '  Closed after a successful conversation.  ',
    });

    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: 'listing-id' },
      data: {
        status: ListingStatus.CLOSED,
        closedAt: expect.any(Date),
      },
    });
    expect(transactionLifecycleUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listingId: 'listing-id' },
        update: expect.objectContaining({
          closeReason: ListingCloseReason.RENTED_VIA_MORADA,
          closeReasonDetail: 'Closed after a successful conversation.',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        lifecycle: expect.objectContaining({
          closeReason: ListingCloseReason.RENTED_VIA_MORADA,
        }),
      }),
    );
  });

  it('returns only active non-deleted listings from an expiry reminder window', async () => {
    lifecycleFindMany.mockResolvedValue([
      { listingId: 'active-id', expiresAt: new Date('2026-08-17T15:00:00.000Z') },
      { listingId: 'closed-id', expiresAt: new Date('2026-08-17T16:00:00.000Z') },
    ]);
    listingFindMany.mockResolvedValue([{ id: 'active-id' }]);

    await expect(
      service.listExpiringBetween(
        new Date('2026-08-17T00:00:00.000Z'),
        new Date('2026-08-17T23:59:59.999Z'),
      ),
    ).resolves.toEqual([
      { listingId: 'active-id', expiresAt: new Date('2026-08-17T15:00:00.000Z') },
    ]);
  });
});
