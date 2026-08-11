import { Injectable } from '@nestjs/common';

import { recordProductEventSafely } from '../analytics/product-analytics';
import { DatabaseService } from '../database/database.service';
import {
  ListingStatus,
  ListingType,
  ProductEventType,
} from '../generated/prisma/enums';
import {
  PublicListingSearchQueryDto,
  PublicListingSort,
} from './dto/public-listing-search-query.dto';
import {
  publicListingCardSelect,
  toPublicListingCard,
} from './public-listing-read-model';

@Injectable()
export class PublicListingSearchService {
  constructor(private readonly database: DatabaseService) {}

  async search(query: PublicListingSearchQueryDto, now = new Date()) {
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
      await this.recordSearch(now);
      return this.emptyResult(query);
    }

    const eligibleIds = eligibleLifecycle.map((row) => row.listingId);
    const expiryByListingId = new Map(
      eligibleLifecycle.map((row) => [row.listingId, row.expiresAt]),
    );
    const availableOn = query.availableOn ? new Date(query.availableOn) : null;

    const where = {
      id: {
        in: eligibleIds,
      },
      status: ListingStatus.ACTIVE,
      deletedAt: null,
      type: query.listingType ?? {
        in: [ListingType.RENTAL, ListingType.TRANSFER],
      },
      county: query.county
        ? {
            equals: query.county,
            mode: 'insensitive' as const,
          }
        : undefined,
      city: query.city
        ? {
            equals: query.city,
            mode: 'insensitive' as const,
          }
        : undefined,
      area: query.area
        ? {
            equals: query.area,
            mode: 'insensitive' as const,
          }
        : undefined,
      propertyType: query.propertyType,
      propertyOccupancyType: query.propertyOccupancyType,
      advertisedSpaceType: query.advertisedSpaceType,
      bathroomType: query.bathroomType,
      billsIncludedType: query.billsIncludedType,
      monthlyPriceCents:
        query.maxPriceCents !== undefined
          ? {
              lte: query.maxPriceCents,
            }
          : undefined,
      couplesAllowed: query.couplesAllowed,
      petsAllowed: query.petsAllowed,
      furnished: query.furnished,
      smokingAllowed: query.smokingAllowed,
      childrenFamiliesAllowed: query.childrenFamiliesAllowed,
      studentsAllowed: query.studentsAllowed,
      bedroomCount:
        query.bedroomCountMin !== undefined
          ? {
              gte: query.bedroomCountMin,
            }
          : undefined,
      bathroomCount:
        query.bathroomCountMin !== undefined
          ? {
              gte: query.bathroomCountMin,
            }
          : undefined,
      minimumStayDays:
        query.maxMinimumStayDays !== undefined
          ? {
              lte: query.maxMinimumStayDays,
            }
          : undefined,
      AND: availableOn
        ? [
            {
              OR: [
                { availableFrom: null },
                { availableFrom: { lte: availableOn } },
              ],
            },
            {
              OR: [
                { availableUntil: null },
                { availableUntil: { gte: availableOn } },
              ],
            },
          ]
        : undefined,
    };

    const [total, listings] = await Promise.all([
      this.database.listing.count({ where }),
      this.database.listing.findMany({
        where,
        orderBy: this.getOrderBy(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: publicListingCardSelect,
      }),
    ]);

    const result = {
      items: listings.flatMap((listing) => {
        const expiresAt = expiryByListingId.get(listing.id);
        return expiresAt ? [toPublicListingCard(listing, expiresAt)] : [];
      }),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      sort: query.sort,
    };

    await this.recordSearch(now);
    return result;
  }

  private recordSearch(occurredAt: Date) {
    return recordProductEventSafely(this.database, {
      type: ProductEventType.SEARCH_PERFORMED,
      occurredAt,
    });
  }

  private emptyResult(query: PublicListingSearchQueryDto) {
    return {
      items: [],
      page: query.page,
      limit: query.limit,
      total: 0,
      totalPages: 0,
      sort: query.sort,
    };
  }

  private getOrderBy(sort: PublicListingSort) {
    switch (sort) {
      case PublicListingSort.PRICE_ASC:
        return [
          { monthlyPriceCents: 'asc' as const },
          { publishedAt: 'desc' as const },
          { id: 'asc' as const },
        ];
      case PublicListingSort.PRICE_DESC:
        return [
          { monthlyPriceCents: 'desc' as const },
          { publishedAt: 'desc' as const },
          { id: 'asc' as const },
        ];
      case PublicListingSort.NEWEST:
        return [{ publishedAt: 'desc' as const }, { id: 'asc' as const }];
      case PublicListingSort.RELEVANCE:
      default:
        return [
          { trustScore: 'desc' as const },
          { publishedAt: 'desc' as const },
          { id: 'asc' as const },
        ];
    }
  }
}
