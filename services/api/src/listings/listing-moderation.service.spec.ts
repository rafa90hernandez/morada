import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

jest.mock('../common/mappers/listing.mapper', () => ({
  ListingMapper: {
    toOwnerResponse: jest.fn((listing) => listing),
  },
}));

import {
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingStatus,
  ListingType,
  PropertyType,
  UserStatus,
} from '../generated/prisma/enums';
import { ListingModerationService } from './listing-moderation.service';

const reviewedAt = new Date('2026-08-10T10:00:00.000Z');

const publishableListing = {
  id: 'listing-id',
  status: ListingStatus.PENDING_REVIEW,
  type: ListingType.RENTAL,
  title: 'Room in Dublin 8',
  description: 'Bright room near the LUAS.',
  city: 'Dublin',
  area: 'Dublin 8',
  propertyType: PropertyType.SINGLE_ROOM,
  monthlyPriceCents: 90000,
  landlordApprovalRequired: false,
  updatedAt: reviewedAt,
  privateLocation: { id: 'private-location' },
  publicLocation: { id: 'public-location' },
  photos: [{ id: 'photo-id' }],
  user: {
    status: UserStatus.ACTIVE,
    verification: {
      identitySubmissions: [
        {
          id: 'identity-id',
          status: IdentityVerificationStatus.APPROVED,
        },
      ],
    },
  },
  authorizationSubmissions: [
    {
      id: 'authorization-id',
      status: ListingAuthorizationStatus.APPROVED,
      relationshipVerified: true,
      landlordAuthorizationVerified: false,
    },
  ],
};

describe('ListingModerationService', () => {
  const findMany = jest.fn();
  const databaseFindFirst = jest.fn();
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

  const service = new ListingModerationService({
    listing: {
      findMany,
      findFirst: databaseFindFirst,
    },
    $transaction,
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue(publishableListing);
    update.mockResolvedValue({
      ...publishableListing,
      status: ListingStatus.ACTIVE,
      rejectionReason: null,
      pausedReason: null,
      publishedAt: new Date(),
    });
    createAdminAction.mockResolvedValue({ id: 'audit-id' });
  });

  it('queries only pending non-deleted listings for the review queue', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.listQueue()).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ListingStatus.PENDING_REVIEW,
          deletedAt: null,
        },
      }),
    );
  });

  it('approves an exact reviewed version when every publication gate passes', async () => {
    await service.approve(
      'admin-id',
      'listing-id',
      reviewedAt.toISOString(),
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-id' },
        data: expect.objectContaining({
          status: ListingStatus.ACTIVE,
          rejectionReason: null,
          pausedReason: null,
          publishedAt: expect.any(Date),
        }),
      }),
    );
    expect(createAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin-id',
          action: 'LISTING_APPROVED',
          targetId: 'listing-id',
          metadata: expect.objectContaining({
            identitySubmissionId: 'identity-id',
            authorizationSubmissionId: 'authorization-id',
            relationshipVerified: true,
          }),
        }),
      }),
    );
  });

  it('rejects stale approval when the listing changed after review', async () => {
    await expect(
      service.approve(
        'admin-id',
        'listing-id',
        '2026-08-10T09:59:00.000Z',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    [
      'approved identity',
      {
        user: {
          ...publishableListing.user,
          verification: {
            identitySubmissions: [
              {
                id: 'identity-id',
                status: IdentityVerificationStatus.REJECTED,
              },
            ],
          },
        },
      },
    ],
    ['private location', { privateLocation: null }],
    ['public location', { publicLocation: null }],
    ['listing photo', { photos: [] }],
    [
      'approved property relationship',
      {
        authorizationSubmissions: [
          {
            ...publishableListing.authorizationSubmissions[0],
            relationshipVerified: false,
          },
        ],
      },
    ],
  ])('blocks publication without %s', async (_label, override) => {
    findFirst.mockResolvedValue({
      ...publishableListing,
      ...override,
    });

    await expect(
      service.approve(
        'admin-id',
        'listing-id',
        reviewedAt.toISOString(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });

  it('requires verified landlord authorization only when the listing requires it', async () => {
    findFirst.mockResolvedValue({
      ...publishableListing,
      landlordApprovalRequired: true,
    });

    await expect(
      service.approve(
        'admin-id',
        'listing-id',
        reviewedAt.toISOString(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(update).not.toHaveBeenCalled();
  });

  it('does not publish WANTED listings in Beta 1', async () => {
    findFirst.mockResolvedValue({
      ...publishableListing,
      type: ListingType.WANTED,
    });

    await expect(
      service.approve(
        'admin-id',
        'listing-id',
        reviewedAt.toISOString(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records a correction request separately from a final rejection', async () => {
    update.mockResolvedValue({
      ...publishableListing,
      status: ListingStatus.REJECTED,
      rejectionReason: 'Add a readable tenancy agreement.',
    });

    await service.requestCorrection(
      'admin-id',
      'listing-id',
      '  Add a readable tenancy agreement.  ',
    );

    expect(createAdminAction).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-id',
        action: 'LISTING_CORRECTION_REQUESTED',
        targetType: 'LISTING',
        targetId: 'listing-id',
        reason: 'Add a readable tenancy agreement.',
        metadata: {
          previousStatus: ListingStatus.PENDING_REVIEW,
          outcome: 'CORRECTION_REQUIRED',
        },
      },
    });
  });

  it('rejects moderation when the listing does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.approve(
        'admin-id',
        'missing',
        reviewedAt.toISOString(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a blank correction/rejection reason before starting a transaction', () => {
    expect(() =>
      service.requestCorrection('admin-id', 'listing-id', '   '),
    ).toThrow(BadRequestException);
    expect(() => service.reject('admin-id', 'listing-id', '   ')).toThrow(
      BadRequestException,
    );
  });
});
