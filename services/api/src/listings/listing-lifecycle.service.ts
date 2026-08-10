import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingCloseReason,
  ListingStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { CloseListingDto } from './dto/close-listing.dto';
import { ListingsService } from './listings.service';

const LISTING_VALIDITY_DAYS = 45;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

@Injectable()
export class ListingLifecycleService {
  constructor(
    private readonly database: DatabaseService,
    private readonly listingsService: ListingsService,
  ) {}

  async findPublicById(id: string, now = new Date()) {
    const lifecycle = await this.database.listingLifecycle.findUnique({
      where: {
        listingId: id,
      },
      select: {
        expiresAt: true,
      },
    });

    if (!lifecycle?.expiresAt || lifecycle.expiresAt.getTime() <= now.getTime()) {
      throw new NotFoundException('Listing not found.');
    }

    return this.listingsService.findPublicById(id);
  }

  async renew(userId: string, id: string, now = new Date()) {
    const listing = await this.database.listing.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        landlordApprovalRequired: true,
        privateLocation: {
          select: {
            id: true,
          },
        },
        publicLocation: {
          select: {
            id: true,
          },
        },
        photos: {
          take: 1,
          select: {
            id: true,
          },
        },
        user: {
          select: {
            status: true,
            verification: {
              select: {
                identitySubmissions: {
                  where: {
                    deletedAt: null,
                  },
                  orderBy: {
                    submittedAt: 'desc',
                  },
                  take: 1,
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
        authorizationSubmissions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            submittedAt: 'desc',
          },
          take: 1,
          select: {
            status: true,
            relationshipVerified: true,
            landlordAuthorizationVerified: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    this.assertRenewable(listing);

    const lifecycle = await this.database.listingLifecycle.upsert({
      where: {
        listingId: id,
      },
      create: {
        listingId: id,
        expiresAt: addDays(now, LISTING_VALIDITY_DAYS),
        lastRenewedAt: now,
      },
      update: {
        expiresAt: addDays(now, LISTING_VALIDITY_DAYS),
        lastRenewedAt: now,
        closeReason: null,
        closeReasonDetail: null,
      },
      select: {
        expiresAt: true,
        lastRenewedAt: true,
      },
    });

    const ownerListing = await this.listingsService.findMineById(userId, id);

    return {
      ...ownerListing,
      lifecycle,
    };
  }

  async close(userId: string, id: string, dto: CloseListingDto) {
    const listing = await this.database.listing.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    if (listing.status === ListingStatus.CLOSED) {
      throw new BadRequestException('Listing is already closed.');
    }

    const detail = dto.detail?.trim() || null;
    const closedAt = new Date();

    const lifecycle = await this.database.$transaction(async (transaction) => {
      await transaction.listing.update({
        where: {
          id,
        },
        data: {
          status: ListingStatus.CLOSED,
          closedAt,
        },
      });

      return transaction.listingLifecycle.upsert({
        where: {
          listingId: id,
        },
        create: {
          listingId: id,
          closeReason: dto.reason,
          closeReasonDetail: detail,
        },
        update: {
          closeReason: dto.reason,
          closeReasonDetail: detail,
        },
        select: {
          expiresAt: true,
          lastRenewedAt: true,
          closeReason: true,
          closeReasonDetail: true,
        },
      });
    });

    const ownerListing = await this.listingsService.findMineById(userId, id);

    return {
      ...ownerListing,
      lifecycle,
    };
  }

  async listExpiringBetween(from: Date, to: Date) {
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Expiry window start must be before end.');
    }

    const lifecycleRows = await this.database.listingLifecycle.findMany({
      where: {
        expiresAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        listingId: true,
        expiresAt: true,
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    if (lifecycleRows.length === 0) {
      return [];
    }

    const activeListings = await this.database.listing.findMany({
      where: {
        id: {
          in: lifecycleRows.map((row) => row.listingId),
        },
        status: ListingStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const activeIds = new Set(activeListings.map((listing) => listing.id));

    return lifecycleRows.filter((row) => activeIds.has(row.listingId));
  }

  private assertRenewable(listing: {
    status: ListingStatus;
    privateLocation: { id: string } | null;
    publicLocation: { id: string } | null;
    photos: Array<{ id: string }>;
    landlordApprovalRequired: boolean | null;
    user: {
      status: UserStatus;
      verification: {
        identitySubmissions: Array<{
          status: IdentityVerificationStatus;
        }>;
      } | null;
    };
    authorizationSubmissions: Array<{
      status: ListingAuthorizationStatus;
      relationshipVerified: boolean | null;
      landlordAuthorizationVerified: boolean | null;
    }>;
  }): void {
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException(
        'Only an active listing that has already passed moderation can be renewed.',
      );
    }

    if (listing.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('The advertiser account must remain active.');
    }

    const identity = listing.user.verification?.identitySubmissions[0];
    if (identity?.status !== IdentityVerificationStatus.APPROVED) {
      throw new BadRequestException(
        'Approved advertiser identity is required for renewal.',
      );
    }

    if (!listing.privateLocation || !listing.publicLocation) {
      throw new BadRequestException(
        'Complete listing location is required for renewal.',
      );
    }

    if (listing.photos.length === 0) {
      throw new BadRequestException('At least one photo is required for renewal.');
    }

    const authorization = listing.authorizationSubmissions[0];
    if (
      authorization?.status !== ListingAuthorizationStatus.APPROVED ||
      authorization.relationshipVerified !== true
    ) {
      throw new BadRequestException(
        'Approved relationship-to-property evidence is required for renewal.',
      );
    }

    if (
      listing.landlordApprovalRequired === true &&
      authorization.landlordAuthorizationVerified !== true
    ) {
      throw new BadRequestException(
        'Verified landlord authorization is required for renewal.',
      );
    }
  }
}

export { LISTING_VALIDITY_DAYS, addDays };
