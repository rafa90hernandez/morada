import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingStatus, ListingType } from '../generated/prisma/enums';
import {
  publicListingDetailSelect,
  toPublicListingDetail,
} from './public-listing-read-model';

@Injectable()
export class PublicListingDetailService {
  constructor(private readonly database: DatabaseService) {}

  async getById(id: string, now = new Date()) {
    const lifecycle = await this.database.listingLifecycle.findUnique({
      where: { listingId: id },
      select: { expiresAt: true },
    });

    if (!lifecycle?.expiresAt || lifecycle.expiresAt.getTime() <= now.getTime()) {
      throw new NotFoundException('Listing not found.');
    }

    const listing = await this.database.listing.findFirst({
      where: {
        id,
        status: ListingStatus.ACTIVE,
        deletedAt: null,
        type: {
          in: [ListingType.RENTAL, ListingType.TRANSFER],
        },
      },
      select: publicListingDetailSelect,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return toPublicListingDetail(listing, lifecycle.expiresAt);
  }
}
