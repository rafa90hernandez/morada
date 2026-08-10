import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingStatus, ListingType } from '../generated/prisma/enums';
import {
  publicListingCardSelect,
  toPublicListingCard,
} from './public-listing-read-model';

@Injectable()
export class FavoritesService {
  constructor(private readonly database: DatabaseService) {}

  async add(userId: string, listingId: string, now = new Date()) {
    await this.assertPublicEligible(listingId, now);

    const favorite = await this.database.favorite.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
      create: {
        userId,
        listingId,
      },
      update: {},
      select: {
        id: true,
        listingId: true,
        createdAt: true,
      },
    });

    return favorite;
  }

  async remove(userId: string, listingId: string) {
    await this.database.favorite.deleteMany({
      where: {
        userId,
        listingId,
      },
    });

    return { removed: true };
  }

  async list(userId: string, now = new Date()) {
    const eligibleLifecycle = await this.database.listingLifecycle.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
      },
      select: {
        listingId: true,
        expiresAt: true,
      },
    });

    if (eligibleLifecycle.length === 0) {
      return [];
    }

    const expiryByListingId = new Map(
      eligibleLifecycle.map((row) => [row.listingId, row.expiresAt]),
    );

    const favorites = await this.database.favorite.findMany({
      where: {
        userId,
        listingId: {
          in: eligibleLifecycle.map((row) => row.listingId),
        },
        listing: {
          status: ListingStatus.ACTIVE,
          deletedAt: null,
          type: {
            in: [ListingType.RENTAL, ListingType.TRANSFER],
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        listing: {
          select: publicListingCardSelect,
        },
      },
    });

    return favorites.flatMap((favorite) => {
      const expiresAt = expiryByListingId.get(favorite.listing.id);
      if (!expiresAt) {
        return [];
      }

      return [
        {
          favoriteId: favorite.id,
          favoritedAt: favorite.createdAt,
          listing: toPublicListingCard(favorite.listing, expiresAt),
        },
      ];
    });
  }

  private async assertPublicEligible(listingId: string, now: Date) {
    const lifecycle = await this.database.listingLifecycle.findUnique({
      where: { listingId },
      select: { expiresAt: true },
    });

    if (
      !lifecycle?.expiresAt ||
      lifecycle.expiresAt.getTime() <= now.getTime()
    ) {
      throw new NotFoundException('Listing not found.');
    }

    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        status: ListingStatus.ACTIVE,
        deletedAt: null,
        type: {
          in: [ListingType.RENTAL, ListingType.TRANSFER],
        },
      },
      select: { id: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }
  }
}
