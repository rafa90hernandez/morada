import { NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  ListingAuthorizationStatus,
  ListingStatus,
} from '../generated/prisma/enums';
import { ListingTrustService } from './listing-trust.service';

describe('ListingTrustService', () => {
  const findFirst = jest.fn();
  const findLifecycle = jest.fn();
  const service = new ListingTrustService({
    listing: { findFirst },
    listingLifecycle: { findUnique: findLifecycle },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findLifecycle.mockResolvedValue({
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
  });

  it('reads trust only for active non-deleted non-expired listings', async () => {
    findFirst.mockResolvedValue({
      id: 'listing-id',
      landlordApprovalRequired: false,
      user: {
        verification: { documentStatus: 'APPROVED' },
      },
      authorizationSubmissions: [
        {
          status: ListingAuthorizationStatus.APPROVED,
          relationshipVerified: true,
          landlordAuthorizationVerified: false,
        },
      ],
    });

    await expect(service.getPublicTrust('listing-id')).resolves.toEqual({
      listingId: 'listing-id',
      identityVerified: true,
      relationshipVerified: true,
      landlordAuthorization: {
        requiredByListing: false,
        status: 'NOT_VERIFIED',
      },
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'listing-id',
          status: ListingStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    );
  });

  it('distinguishes verified landlord authorization from relationship verification', async () => {
    findFirst.mockResolvedValue({
      id: 'listing-id',
      landlordApprovalRequired: true,
      user: {
        verification: { documentStatus: 'APPROVED' },
      },
      authorizationSubmissions: [
        {
          status: ListingAuthorizationStatus.APPROVED,
          relationshipVerified: true,
          landlordAuthorizationVerified: true,
        },
      ],
    });

    await expect(service.getPublicTrust('listing-id')).resolves.toMatchObject({
      identityVerified: true,
      relationshipVerified: true,
      landlordAuthorization: {
        requiredByListing: true,
        status: 'VERIFIED',
      },
    });
  });

  it('does not turn an unapproved authorization attempt into a public trust claim', async () => {
    findFirst.mockResolvedValue({
      id: 'listing-id',
      landlordApprovalRequired: false,
      user: {
        verification: { documentStatus: 'APPROVED' },
      },
      authorizationSubmissions: [
        {
          status: ListingAuthorizationStatus.SUBMITTED,
          relationshipVerified: true,
          landlordAuthorizationVerified: true,
        },
      ],
    });

    await expect(service.getPublicTrust('listing-id')).resolves.toMatchObject({
      relationshipVerified: false,
      landlordAuthorization: {
        status: 'NOT_VERIFIED',
      },
    });
  });

  it('does not expose trust for an expired listing', async () => {
    findLifecycle.mockResolvedValue({
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(service.getPublicTrust('listing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('does not expose trust for a non-public listing', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.getPublicTrust('listing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
