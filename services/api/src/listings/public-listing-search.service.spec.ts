jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  BathroomType,
  BillsIncludedType,
  ListingStatus,
  PropertyType,
} from '../generated/prisma/enums';
import {
  PublicListingSearchQueryDto,
  PublicListingSort,
} from './dto/public-listing-search-query.dto';
import { PublicListingSearchService } from './public-listing-search.service';

const now = new Date('2026-08-10T16:00:00.000Z');

describe('PublicListingSearchService', () => {
  const lifecycleFindMany = jest.fn();
  const listingCount = jest.fn();
  const listingFindMany = jest.fn();

  const service = new PublicListingSearchService({
    listingLifecycle: {
      findMany: lifecycleFindMany,
    },
    listing: {
      count: listingCount,
      findMany: listingFindMany,
    },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    lifecycleFindMany.mockResolvedValue([
      {
        listingId: 'listing-1',
        expiresAt: new Date('2026-08-20T16:00:00.000Z'),
      },
    ]);
    listingCount.mockResolvedValue(1);
    listingFindMany.mockResolvedValue([
      {
        id: 'listing-1',
        type: 'RENTAL',
        title: 'Room in Dublin 8',
        city: 'Dublin',
        area: 'Dublin 8',
        county: 'Dublin',
        postalDistrict: 'D8',
        propertyType: PropertyType.SINGLE_ROOM,
        propertyOccupancyType: 'SHARED_PROPERTY',
        advertisedSpaceType: 'PRIVATE',
        bathroomType: BathroomType.SHARED,
        bedroomCount: 2,
        bathroomCount: 1,
        monthlyPriceCents: 95000,
        billsIncludedType: BillsIncludedType.NO,
        furnished: true,
        couplesAllowed: false,
        petsAllowed: false,
        smokingAllowed: false,
        availableFrom: new Date('2026-08-15T00:00:00.000Z'),
        minimumStayDays: 90,
        trustScore: 80,
        publishedAt: new Date('2026-08-01T00:00:00.000Z'),
        photos: [{ id: 'photo-1', url: 'https://example.test/photo.jpg', position: 0 }],
        publicLocation: {
          latitude: 53.34,
          longitude: -6.29,
          radiusMeters: 1500,
          approximationVersion: 'GRID_V1',
        },
      },
    ]);
  });

  it('searches only lifecycle-eligible active public inventory with composable filters', async () => {
    const query = Object.assign(new PublicListingSearchQueryDto(), {
      city: 'Dublin',
      maxPriceCents: 100000,
      propertyType: PropertyType.SINGLE_ROOM,
      bathroomType: BathroomType.SHARED,
      billsIncludedType: BillsIncludedType.NO,
      furnished: true,
      couplesAllowed: false,
      page: 1,
      limit: 20,
    });

    await service.search(query, now);

    expect(lifecycleFindMany).toHaveBeenCalledWith({
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

    const findArgs = listingFindMany.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const where = findArgs.where as Record<string, unknown>;

    expect(where).toEqual(
      expect.objectContaining({
        status: ListingStatus.ACTIVE,
        deletedAt: null,
        city: { equals: 'Dublin', mode: 'insensitive' },
        monthlyPriceCents: { lte: 100000 },
        propertyType: PropertyType.SINGLE_ROOM,
        bathroomType: BathroomType.SHARED,
        billsIncludedType: BillsIncludedType.NO,
        furnished: true,
        couplesAllowed: false,
      }),
    );
  });

  it('uses deterministic relevance ordering without renewal metadata', async () => {
    const query = new PublicListingSearchQueryDto();

    await service.search(query, now);

    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { trustScore: 'desc' },
          { publishedAt: 'desc' },
          { id: 'asc' },
        ],
      }),
    );
  });

  it('uses publishedAt rather than lastRenewedAt for newest ordering', async () => {
    const query = Object.assign(new PublicListingSearchQueryDto(), {
      sort: PublicListingSort.NEWEST,
    });

    await service.search(query, now);

    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('selects public location only and never requests private location or evidence', async () => {
    const query = new PublicListingSearchQueryDto();

    const result = await service.search(query, now);

    const findArgs = listingFindMany.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };

    expect(findArgs.select.privateLocation).toBeUndefined();
    expect(findArgs.select.authorizationSubmissions).toBeUndefined();
    expect(findArgs.select.publicLocation).toBeDefined();
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'listing-1',
        expiresAt: new Date('2026-08-20T16:00:00.000Z'),
      }),
    );
  });

  it('returns an empty paginated result without querying listings when no lifecycle is eligible', async () => {
    lifecycleFindMany.mockResolvedValue([]);
    const query = Object.assign(new PublicListingSearchQueryDto(), {
      page: 2,
      limit: 10,
    });

    await expect(service.search(query, now)).resolves.toEqual({
      items: [],
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 0,
      sort: PublicListingSort.RELEVANCE,
    });

    expect(listingCount).not.toHaveBeenCalled();
    expect(listingFindMany).not.toHaveBeenCalled();
  });
});
