import { NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingStatus } from '../generated/prisma/enums';
import { FavoritesService } from './favorites.service';

const now = new Date('2026-08-10T17:00:00.000Z');

const publicCardRow = {
  id: 'listing-id',
  type: 'RENTAL',
  title: 'Room in Dublin 8',
  city: 'Dublin',
  area: 'Dublin 8',
  county: 'Dublin',
  postalDistrict: 'D8',
  propertyType: 'SINGLE_ROOM',
  propertyOccupancyType: 'SHARED_PROPERTY',
  advertisedSpaceType: 'PRIVATE',
  bathroomType: 'SHARED',
  bedroomCount: 2,
  bathroomCount: 1,
  monthlyPriceCents: 95000,
  billsIncludedType: 'NO',
  furnished: true,
  couplesAllowed: false,
  petsAllowed: false,
  smokingAllowed: false,
  availableFrom: new Date('2026-08-15T00:00:00.000Z'),
  minimumStayDays: 90,
  trustScore: 80,
  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
  photos: [],
  publicLocation: {
    latitude: 53.34,
    longitude: -6.29,
    radiusMeters: 1500,
    approximationVersion: 'GRID_V1',
  },
};

describe('FavoritesService', () => {
  const lifecycleFindUnique = jest.fn();
  const lifecycleFindMany = jest.fn();
  const listingFindFirst = jest.fn();
  const favoriteUpsert = jest.fn();
  const favoriteDeleteMany = jest.fn();
  const favoriteFindMany = jest.fn();

  const service = new FavoritesService({
    listingLifecycle: {
      findUnique: lifecycleFindUnique,
      findMany: lifecycleFindMany,
    },
    listing: {
      findFirst: listingFindFirst,
    },
    favorite: {
      upsert: favoriteUpsert,
      deleteMany: favoriteDeleteMany,
      findMany: favoriteFindMany,
    },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    lifecycleFindUnique.mockResolvedValue({
      expiresAt: new Date('2026-08-20T17:00:00.000Z'),
    });
    lifecycleFindMany.mockResolvedValue([
      {
        listingId: 'listing-id',
        expiresAt: new Date('2026-08-20T17:00:00.000Z'),
      },
    ]);
    listingFindFirst.mockResolvedValue({ id: 'listing-id' });
    favoriteUpsert.mockResolvedValue({
      id: 'favorite-id',
      listingId: 'listing-id',
      createdAt: now,
    });
    favoriteDeleteMany.mockResolvedValue({ count: 1 });
    favoriteFindMany.mockResolvedValue([
      {
        id: 'favorite-id',
        createdAt: now,
        listing: publicCardRow,
      },
    ]);
  });

  it('favorites through the compound key so duplicate requests are idempotent', async () => {
    await service.add('user-id', 'listing-id', now);

    expect(favoriteUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_listingId: {
            userId: 'user-id',
            listingId: 'listing-id',
          },
        },
        update: {},
      }),
    );
  });

  it('rejects an expired listing before creating a favorite', async () => {
    lifecycleFindUnique.mockResolvedValue({ expiresAt: now });

    await expect(service.add('user-id', 'listing-id', now)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(favoriteUpsert).not.toHaveBeenCalled();
  });

  it('removes only the authenticated user favorite and stays idempotent', async () => {
    await expect(service.remove('user-id', 'listing-id')).resolves.toEqual({
      removed: true,
    });

    expect(favoriteDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        listingId: 'listing-id',
      },
    });
  });

  it('lists only active eligible inventory using the public card projection', async () => {
    const result = await service.list('user-id', now);

    const args = favoriteFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      select: {
        listing: {
          select: Record<string, unknown>;
        };
      };
    };

    expect(args.where).toEqual(
      expect.objectContaining({
        userId: 'user-id',
        listing: expect.objectContaining({
          status: ListingStatus.ACTIVE,
          deletedAt: null,
        }),
      }),
    );
    expect(args.select.listing.select.privateLocation).toBeUndefined();
    expect(args.select.listing.select.authorizationSubmissions).toBeUndefined();
    expect(result[0]).toEqual(
      expect.objectContaining({
        favoriteId: 'favorite-id',
        listing: expect.objectContaining({ id: 'listing-id' }),
      }),
    );
  });

  it('returns no public favorites when no lifecycle is eligible', async () => {
    lifecycleFindMany.mockResolvedValue([]);

    await expect(service.list('user-id', now)).resolves.toEqual([]);
    expect(favoriteFindMany).not.toHaveBeenCalled();
  });
});
