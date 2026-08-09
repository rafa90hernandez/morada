import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingStatus } from '../generated/prisma/enums';
import { ListingPrivateLocationDto } from './dto/listing-private-location.dto';
import { deriveApproximatePublicLocation } from './listing-location-privacy';

type StoredPrivateLocation = {
  addressLine1: string;
  addressLine2: string | null;
  eircode: string | null;
  exactLatitude: number;
  exactLongitude: number;
};

type StoredListingLocation = {
  city: string | null;
  area: string | null;
  county: string | null;
  postalDistrict: string | null;
  privateLocation: StoredPrivateLocation | null;
};

function normalizeOptional(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function hasLocationChanged(
  current: StoredListingLocation,
  next: ListingPrivateLocationDto,
): boolean {
  const privateLocation = current.privateLocation;

  return (
    current.city !== next.city.trim() ||
    current.area !== next.area.trim() ||
    current.county !== next.county.trim() ||
    current.postalDistrict !== normalizeOptional(next.postalDistrict) ||
    !privateLocation ||
    privateLocation.addressLine1 !== next.addressLine1.trim() ||
    privateLocation.addressLine2 !== normalizeOptional(next.addressLine2) ||
    privateLocation.eircode !== normalizeOptional(next.eircode)?.toUpperCase() ||
    privateLocation.exactLatitude !== next.exactLatitude ||
    privateLocation.exactLongitude !== next.exactLongitude
  );
}

@Injectable()
export class ListingLocationService {
  constructor(private readonly database: DatabaseService) {}

  async setOwnerLocation(
    userId: string,
    listingId: string,
    dto: ListingPrivateLocationDto,
  ) {
    const approximate = deriveApproximatePublicLocation({
      latitude: dto.exactLatitude,
      longitude: dto.exactLongitude,
    });

    return this.database.$transaction(async (transaction) => {
      const current = await transaction.listing.findFirst({
        where: {
          id: listingId,
          userId,
          deletedAt: null,
        },
        include: {
          privateLocation: true,
        },
      });

      if (!current) {
        throw new NotFoundException('Listing not found.');
      }

      if (current.status === ListingStatus.CLOSED) {
        throw new BadRequestException(
          'Closed listings cannot change their location.',
        );
      }

      const changed = hasLocationChanged(current, dto);
      const wasApproved =
        current.status === ListingStatus.ACTIVE ||
        current.status === ListingStatus.PAUSED;

      const city = dto.city.trim();
      const area = dto.area.trim();
      const county = dto.county.trim();
      const postalDistrict = normalizeOptional(dto.postalDistrict);
      const addressLine1 = dto.addressLine1.trim();
      const addressLine2 = normalizeOptional(dto.addressLine2);
      const eircode = normalizeOptional(dto.eircode)?.toUpperCase() ?? null;

      const listing = await transaction.listing.update({
        where: { id: listingId },
        data: {
          city,
          area,
          county,
          postalDistrict,
          ...(changed && wasApproved
            ? {
                status: ListingStatus.PENDING_REVIEW,
                rejectionReason: null,
                pausedReason: null,
                publishedAt: null,
              }
            : {}),
          privateLocation: {
            upsert: {
              create: {
                addressLine1,
                addressLine2,
                eircode,
                exactLatitude: dto.exactLatitude,
                exactLongitude: dto.exactLongitude,
              },
              update: {
                addressLine1,
                addressLine2,
                eircode,
                exactLatitude: dto.exactLatitude,
                exactLongitude: dto.exactLongitude,
              },
            },
          },
          publicLocation: {
            upsert: {
              create: approximate,
              update: approximate,
            },
          },
        },
        include: {
          privateLocation: true,
          publicLocation: true,
        },
      });

      return this.toOwnerResponse(listing);
    });
  }

  async getOwnerLocation(userId: string, listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        userId,
        deletedAt: null,
      },
      include: {
        privateLocation: true,
        publicLocation: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return this.toOwnerResponse(listing);
  }

  async getAdminLocation(listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        deletedAt: null,
      },
      include: {
        privateLocation: true,
        publicLocation: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return this.toOwnerResponse(listing);
  }

  async getPublicLocation(listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        status: ListingStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        city: true,
        area: true,
        county: true,
        postalDistrict: true,
        publicLocation: true,
      },
    });

    if (!listing || !listing.publicLocation) {
      throw new NotFoundException('Public listing location not found.');
    }

    return {
      listingId: listing.id,
      city: listing.city,
      area: listing.area,
      county: listing.county,
      postalDistrict: listing.postalDistrict,
      approximate: {
        latitude: listing.publicLocation.latitude,
        longitude: listing.publicLocation.longitude,
        radiusMeters: listing.publicLocation.radiusMeters,
        approximationVersion: listing.publicLocation.approximationVersion,
      },
    };
  }

  private toOwnerResponse(listing: {
    id: string;
    city: string | null;
    area: string | null;
    county: string | null;
    postalDistrict: string | null;
    privateLocation: StoredPrivateLocation | null;
    publicLocation: {
      latitude: number;
      longitude: number;
      radiusMeters: number;
      approximationVersion: string;
    } | null;
  }) {
    return {
      listingId: listing.id,
      city: listing.city,
      area: listing.area,
      county: listing.county,
      postalDistrict: listing.postalDistrict,
      private: listing.privateLocation
        ? {
            addressLine1: listing.privateLocation.addressLine1,
            addressLine2: listing.privateLocation.addressLine2,
            eircode: listing.privateLocation.eircode,
            exactLatitude: listing.privateLocation.exactLatitude,
            exactLongitude: listing.privateLocation.exactLongitude,
          }
        : null,
      approximate: listing.publicLocation
        ? {
            latitude: listing.publicLocation.latitude,
            longitude: listing.publicLocation.longitude,
            radiusMeters: listing.publicLocation.radiusMeters,
            approximationVersion: listing.publicLocation.approximationVersion,
          }
        : null,
    };
  }
}
