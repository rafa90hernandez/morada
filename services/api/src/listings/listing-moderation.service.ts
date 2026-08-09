import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ListingMapper } from '../common/mappers/listing.mapper';
import { DatabaseService } from '../database/database.service';
import { ListingStatus } from '../generated/prisma/enums';

const moderationListingRelations = {
  user: {
    include: {
      profile: true,
      trustScore: true,
    },
  },
  photos: {
    orderBy: {
      position: 'asc' as const,
    },
  },
  exchangePreference: true,
  transportOptions: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
};

@Injectable()
export class ListingModerationService {
  constructor(private readonly database: DatabaseService) {}

  async approve(adminId: string, listingId: string) {
    return this.database.$transaction(async (transaction) => {
      const currentListing = await transaction.listing.findFirst({
        where: {
          id: listingId,
          deletedAt: null,
        },
        include: moderationListingRelations,
      });

      if (!currentListing) {
        throw new NotFoundException('Listing not found.');
      }

      if (currentListing.status !== ListingStatus.PENDING_REVIEW) {
        throw new BadRequestException(
          'Only listings pending review can be approved.',
        );
      }

      const listing = await transaction.listing.update({
        where: {
          id: listingId,
        },
        data: {
          status: ListingStatus.ACTIVE,
          rejectionReason: null,
          pausedReason: null,
          publishedAt: new Date(),
        },
        include: moderationListingRelations,
      });

      await transaction.adminActionLog.create({
        data: {
          adminId,
          action: 'LISTING_APPROVED',
          targetType: 'LISTING',
          targetId: listingId,
          metadata: {
            previousStatus: currentListing.status,
          },
        },
      });

      return ListingMapper.toOwnerResponse(listing);
    });
  }

  async reject(adminId: string, listingId: string, reason: string) {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new BadRequestException('Rejection reason is required.');
    }

    return this.database.$transaction(async (transaction) => {
      const currentListing = await transaction.listing.findFirst({
        where: {
          id: listingId,
          deletedAt: null,
        },
        include: moderationListingRelations,
      });

      if (!currentListing) {
        throw new NotFoundException('Listing not found.');
      }

      if (currentListing.status !== ListingStatus.PENDING_REVIEW) {
        throw new BadRequestException(
          'Only listings pending review can be rejected.',
        );
      }

      const listing = await transaction.listing.update({
        where: {
          id: listingId,
        },
        data: {
          status: ListingStatus.REJECTED,
          rejectionReason: normalizedReason,
          pausedReason: null,
          publishedAt: null,
        },
        include: moderationListingRelations,
      });

      await transaction.adminActionLog.create({
        data: {
          adminId,
          action: 'LISTING_REJECTED',
          targetType: 'LISTING',
          targetId: listingId,
          reason: normalizedReason,
          metadata: {
            previousStatus: currentListing.status,
          },
        },
      });

      return ListingMapper.toOwnerResponse(listing);
    });
  }
}
