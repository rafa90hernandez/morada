import { BadRequestException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingStatus, ListingType } from '../generated/prisma/enums';
import { PublicMapBoundsQueryDto } from './dto/public-map-bounds-query.dto';

const MAX_VIEWPORT_LATITUDE_SPAN = 5;
const MAX_VIEWPORT_LONGITUDE_SPAN = 6;

@Injectable()
export class PublicMapDiscoveryService {
  constructor(private readonly database: DatabaseService) {}

  async searchVisibleArea(query: PublicMapBoundsQueryDto, now = new Date()) {
    this.validateBounds(query);

    const eligibleLifecycle = await this.database.listingLifecycle.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
      },
      select: {
        listingId: true,
      },
    });

    if (eligibleLifecycle.length === 0) {
      return {
        markers: [],
        truncated: false,
        limit: query.limit,
      };
    }

    const locations = await this.database.listingPublicLocation.findMany({
      where: {
        listingId: {
          in: eligibleLifecycle.map((row) => row.listingId),
        },
        latitude: {
          gte: query.south,
          lte: query.north,
        },
        longitude: {
          gte: query.west,
          lte: query.east,
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
        listingId: 'asc',
      },
      take: query.limit + 1,
      select: {
        listingId: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        approximationVersion: true,
        listing: {
          select: {
            title: true,
            monthlyPriceCents: true,
            propertyType: true,
            advertisedSpaceType: true,
          },
        },
      },
    });

    const truncated = locations.length > query.limit;

    return {
      markers: locations.slice(0, query.limit).map((location) => ({
        listingId: location.listingId,
        position: {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: location.radiusMeters,
          approximationVersion: location.approximationVersion,
        },
        label: {
          title: location.listing.title,
          monthlyPriceCents: location.listing.monthlyPriceCents,
          currency: 'EUR',
          propertyType: location.listing.propertyType,
          advertisedSpaceType: location.listing.advertisedSpaceType,
        },
      })),
      truncated,
      limit: query.limit,
    };
  }

  private validateBounds(query: PublicMapBoundsQueryDto): void {
    if (query.north <= query.south) {
      throw new BadRequestException('north must be greater than south.');
    }

    if (query.east <= query.west) {
      throw new BadRequestException(
        'east must be greater than west for the Beta 1 viewport contract.',
      );
    }

    if (query.north - query.south > MAX_VIEWPORT_LATITUDE_SPAN) {
      throw new BadRequestException('Latitude viewport is too large.');
    }

    if (query.east - query.west > MAX_VIEWPORT_LONGITUDE_SPAN) {
      throw new BadRequestException('Longitude viewport is too large.');
    }
  }
}

export {
  MAX_VIEWPORT_LATITUDE_SPAN,
  MAX_VIEWPORT_LONGITUDE_SPAN,
};
