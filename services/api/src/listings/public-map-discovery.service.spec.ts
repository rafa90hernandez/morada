import { BadRequestException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingStatus } from '../generated/prisma/enums';
import { PublicMapBoundsQueryDto } from './dto/public-map-bounds-query.dto';
import { PublicMapDiscoveryService } from './public-map-discovery.service';

const now = new Date('2026-08-11T00:00:00.000Z');

function makeQuery(overrides: Partial<PublicMapBoundsQueryDto> = {}) {
  return Object.assign(new PublicMapBoundsQueryDto(), {
    north: 53.5,
    south: 53.2,
    east: -6,
    west: -6.5,
    limit: 200,
    ...overrides,
  });
}

describe('PublicMapDiscoveryService', () => {
  const lifecycleFindMany = jest.fn();
  const publicLocationFindMany = jest.fn();

  const service = new PublicMapDiscoveryService({
    listingLifecycle: { findMany: lifecycleFindMany },
    listingPublicLocation: { findMany: publicLocationFindMany },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    lifecycleFindMany.mockResolvedValue([
      { listingId: 'listing-1' },
      { listingId: 'listing-2' },
    ]);
    publicLocationFindMany.mockResolvedValue([
      {
        listingId: 'listing-1',
        latitude: 53.34,
        longitude: -6.29,
        radiusMeters: 1500,
        approximationVersion: 'GRID_V1',
        listing: {
          title: 'Room in Dublin 8',
          monthlyPriceCents: 95000,
          propertyType: 'SINGLE_ROOM',
          advertisedSpaceType: 'PRIVATE',
        },
      },
    ]);
  });

  it('queries only non-expired lifecycle ids and approximate public locations', async () => {
    const query = makeQuery();
    await service.searchVisibleArea(query, now);

    expect(lifecycleFindMany).toHaveBeenCalledWith({
      where: { expiresAt: { gt: now } },
      select: { listingId: true },
    });

    const args = publicLocationFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
      take: number;
    };

    expect(args.where).toEqual(
      expect.objectContaining({
        listingId: { in: ['listing-1', 'listing-2'] },
        latitude: { gte: 53.2, lte: 53.5 },
        longitude: { gte: -6.5, lte: -6 },
        listing: expect.objectContaining({
          status: ListingStatus.ACTIVE,
          deletedAt: null,
        }),
      }),
    );
    expect(args.select.privateLocation).toBeUndefined();
    expect(args.select.listing).toBeDefined();
    expect(args.take).toBe(201);
  });

  it('returns clustering-friendly approximate markers without exact address data', async () => {
    const result = await service.searchVisibleArea(makeQuery(), now);

    expect(result).toEqual({
      markers: [
        {
          listingId: 'listing-1',
          position: {
            latitude: 53.34,
            longitude: -6.29,
            radiusMeters: 1500,
            approximationVersion: 'GRID_V1',
          },
          label: {
            title: 'Room in Dublin 8',
            monthlyPriceCents: 95000,
            currency: 'EUR',
            propertyType: 'SINGLE_ROOM',
            advertisedSpaceType: 'PRIVATE',
          },
        },
      ],
      truncated: false,
      limit: 200,
    });

    expect(JSON.stringify(result)).not.toContain('eircode');
    expect(JSON.stringify(result)).not.toContain('addressLine1');
    expect(JSON.stringify(result)).not.toContain('exactLatitude');
  });

  it('flags truncation without returning more than the requested limit', async () => {
    publicLocationFindMany.mockResolvedValue([
      {
        listingId: 'listing-1',
        latitude: 53.34,
        longitude: -6.29,
        radiusMeters: 1500,
        approximationVersion: 'GRID_V1',
        listing: {
          title: 'One',
          monthlyPriceCents: 90000,
          propertyType: 'SINGLE_ROOM',
          advertisedSpaceType: 'PRIVATE',
        },
      },
      {
        listingId: 'listing-2',
        latitude: 53.35,
        longitude: -6.28,
        radiusMeters: 1500,
        approximationVersion: 'GRID_V1',
        listing: {
          title: 'Two',
          monthlyPriceCents: 100000,
          propertyType: 'SINGLE_ROOM',
          advertisedSpaceType: 'PRIVATE',
        },
      },
    ]);

    const result = await service.searchVisibleArea(makeQuery({ limit: 1 }), now);
    expect(result.markers).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });

  it('does not query locations when no listing lifecycle is currently eligible', async () => {
    lifecycleFindMany.mockResolvedValue([]);

    await expect(service.searchVisibleArea(makeQuery(), now)).resolves.toEqual({
      markers: [],
      truncated: false,
      limit: 200,
    });
    expect(publicLocationFindMany).not.toHaveBeenCalled();
  });

  it.each([
    makeQuery({ north: 53.2, south: 53.2 }),
    makeQuery({ east: -6.5, west: -6.5 }),
    makeQuery({ north: 60, south: 53 }),
    makeQuery({ east: 1, west: -6.5 }),
  ])('rejects invalid or excessively large viewports', async (query) => {
    await expect(service.searchVisibleArea(query, now)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(lifecycleFindMany).not.toHaveBeenCalled();
  });
});
