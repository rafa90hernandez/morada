import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  ListingRevisionClassification,
  ListingStatus,
} from '../generated/prisma/enums';
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

function hasPrivateLocationChanged(
  current: StoredPrivateLocation | null,
  next: ListingPrivateLocationDto,
): boolean {
  return (
    !current ||
    current.addressLine1 !== next.addressLine1.trim() ||
    current.addressLine2 !== normalizeOptional(next.addressLine2) ||
    current.eircode !== normalizeOptional(next.eircode)?.toUpperCase() ||
    current.exactLatitude !== next.exactLatitude ||
    current.exactLongitude !== next.exactLongitude
  );
}

function getLocationChangedFields(
  current: StoredListingLocation,
  next: ListingPrivateLocationDto,
): string[] {
  const changedFields: string[] = [];

  if (current.city !== next.city.trim()) changedFields.push('city');
  if (current.area !== next.area.trim()) changedFields.push('area');
  if (current.county !== next.county.trim()) changedFields.push('county');
  if (current.postalDistrict !== normalizeOptional(next.postalDistrict)) {
    changedFields.push('postalDistrict');
  }
  if (hasPrivateLocationChanged(current.privateLocation, next)) {
    changedFields.push('privateLocation');
  }

  return changedFields.sort();
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

      const changedFields = getLocationChangedFields(current, dto);
      const changed = changedFields.length > 0;
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

      if (changed) {
        const before: Record<string, string | null> = {};
        const after: Record<string, string | null> = {};

        for (const field of ['city', 'area', 'county', 'postalDistrict']) {
          if (!changedFields.includes(field)) {
            continue;
          }

          before[field] = current[
            field as keyof StoredListingLocation
          ] as string | null;
          after[field] = {
            city,
            area,
            county,
            postalDistrict,
          }[field as 'city' | 'area' | 'county' | 'postalDistrict'];
        }

        await transaction.listingRevision.create({
          data: {
            listingId,
            actorUserId: userId,
            classification: ListingRevisionClassification.CRITICAL,
            changedFields,
            before,
            after,
            statusBefore: current.status,
            statusAfter: listing.status,
            previousPublishedAt: current.publishedAt,
          },
        });
      }

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
