import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingStatus } from '../generated/prisma/enums';
import { ListingLocationService } from './listing-location.service';

const dto = {
  city: 'Dublin',
  area: 'Dublin 8',
  county: 'Dublin',
  postalDistrict: 'D08',
  addressLine1: '10 Example Street',
  addressLine2: 'Apartment 2',
  eircode: 'd08 ab12',
  exactLatitude: 53.33911,
  exactLongitude: -6.29453,
};

const storedLocation = {
  id: 'listing-id',
  userId: 'owner-id',
  status: ListingStatus.ACTIVE,
  city: 'Dublin',
  area: 'Dublin 8',
  county: 'Dublin',
  postalDistrict: 'D08',
  deletedAt: null,
  privateLocation: {
    addressLine1: '10 Example Street',
    addressLine2: 'Apartment 2',
    eircode: 'D08 AB12',
    exactLatitude: 53.33911,
    exactLongitude: -6.29453,
  },
  publicLocation: {
    latitude: 53.33,
    longitude: -6.29,
    radiusMeters: 1500,
    approximationVersion: 'GRID_V1',
  },
};

describe('ListingLocationService', () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const transaction = {
    listing: {
      findFirst,
      update,
    },
  };
  const database = {
    listing: {
      findFirst,
    },
    $transaction: jest.fn(async (callback) => callback(transaction)),
  };
  const service = new ListingLocationService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes owner writes by authenticated user and derives public coordinates server-side', async () => {
    findFirst.mockResolvedValueOnce({
      ...storedLocation,
      area: 'Dublin 7',
    });
    update.mockResolvedValueOnce({
      ...storedLocation,
      status: ListingStatus.PENDING_REVIEW,
    });

    await service.setOwnerLocation('owner-id', 'listing-id', dto);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'listing-id',
          userId: 'owner-id',
          deletedAt: null,
        },
      }),
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          city: 'Dublin',
          area: 'Dublin 8',
          county: 'Dublin',
          postalDistrict: 'D08',
          status: ListingStatus.PENDING_REVIEW,
          publishedAt: null,
          privateLocation: {
            upsert: expect.objectContaining({
              create: expect.objectContaining({
                eircode: 'D08 AB12',
                exactLatitude: 53.33911,
                exactLongitude: -6.29453,
              }),
              update: expect.any(Object),
            }),
          },
          publicLocation: {
            upsert: {
              create: {
                latitude: 53.33,
                longitude: -6.29,
                radiusMeters: 1500,
                approximationVersion: 'GRID_V1',
              },
              update: {
                latitude: 53.33,
                longitude: -6.29,
                radiusMeters: 1500,
                approximationVersion: 'GRID_V1',
              },
            },
          },
        }),
      }),
    );
  });

  it('does not return an unchanged approved location to review', async () => {
    findFirst.mockResolvedValueOnce(storedLocation);
    update.mockResolvedValueOnce(storedLocation);

    await service.setOwnerLocation('owner-id', 'listing-id', dto);

    const call = update.mock.calls[0][0];
    expect(call.data.status).toBeUndefined();
    expect(call.data.publishedAt).toBeUndefined();
  });

  it('rejects location changes for closed listings', async () => {
    findFirst.mockResolvedValueOnce({
      ...storedLocation,
      status: ListingStatus.CLOSED,
    });

    await expect(
      service.setOwnerLocation('owner-id', 'listing-id', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns not found rather than revealing another owners listing', async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(
      service.setOwnerLocation('wrong-owner', 'listing-id', dto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('public reads select only public-safe location relations', async () => {
    findFirst.mockResolvedValueOnce(storedLocation);

    const result = await service.getPublicLocation('listing-id');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'listing-id',
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
    expect(JSON.stringify(result)).not.toContain('addressLine1');
    expect(JSON.stringify(result)).not.toContain('eircode');
    expect(JSON.stringify(result)).not.toContain('exactLatitude');
  });

  it('owner reads include the exact location only through owner scope', async () => {
    findFirst.mockResolvedValueOnce(storedLocation);

    const result = await service.getOwnerLocation('owner-id', 'listing-id');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'listing-id',
          userId: 'owner-id',
          deletedAt: null,
        },
      }),
    );
    expect(result.private).toEqual(
      expect.objectContaining({
        addressLine1: '10 Example Street',
        eircode: 'D08 AB12',
        exactLatitude: 53.33911,
      }),
    );
  });
});
