import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

jest.mock('../common/mappers/listing.mapper', () => ({
  ListingMapper: {
    toResponse: jest.fn((listing) => listing),
    toOwnerResponse: jest.fn((listing) => listing),
  },
}));

import {
  ListingStatus,
  ListingType,
  PropertyType,
} from '../generated/prisma/enums';
import { ListingsService } from './listings.service';

const baseListing = {
  id: 'listing-id',
  userId: 'owner-id',
  type: ListingType.RENTAL,
  status: ListingStatus.ACTIVE,
  title: 'Room in Dublin 8',
  description: 'Bright room near the LUAS.',
  city: 'Dublin',
  area: 'Dublin 8',
  propertyType: PropertyType.SINGLE_ROOM,
  monthlyPriceCents: 90000,
  depositAmountCents: 90000,
  billsIncludedType: null,
  extraCostsNote: null,
  furnished: true,
  couplesAllowed: false,
  petsAllowed: false,
  smokingAllowed: false,
  genderPreference: null,
  landlordLivesHere: false,
  formalContract: true,
  landlordApprovalRequired: false,
  availableFrom: null,
  availableUntil: null,
  houseRules: null,
  transportInfo: null,
  trustScore: 0,
  rejectionReason: null,
  pausedReason: null,
  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
  closedAt: null,
  deletedAt: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  user: {},
  photos: [],
  exchangePreference: null,
};

describe('ListingsService lifecycle', () => {
  const create = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();

  const database = {
    listing: {
      create,
      findFirst,
      update,
    },
  };

  const service = new ListingsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a listing directly in pending review', async () => {
    create.mockResolvedValue({
      ...baseListing,
      status: ListingStatus.PENDING_REVIEW,
      publishedAt: null,
    });

    await service.create('owner-id', {
      type: ListingType.RENTAL,
      title: 'Room in Dublin 8',
      description: 'Bright room near the LUAS.',
      city: 'Dublin',
      area: 'Dublin 8',
      propertyType: PropertyType.SINGLE_ROOM,
      monthlyPriceCents: 90000,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'owner-id',
          status: ListingStatus.PENDING_REVIEW,
        }),
      }),
    );
  });

  it('pauses an active listing', async () => {
    findFirst.mockResolvedValue(baseListing);
    update.mockResolvedValue({ ...baseListing, status: ListingStatus.PAUSED });

    await service.pause('owner-id', 'listing-id');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-id' },
        data: {
          status: ListingStatus.PAUSED,
          pausedReason: 'Paused by the owner.',
        },
      }),
    );
  });

  it('rejects pausing a non-active listing', async () => {
    findFirst.mockResolvedValue({
      ...baseListing,
      status: ListingStatus.PENDING_REVIEW,
    });

    await expect(service.pause('owner-id', 'listing-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('reactivates a paused listing and preserves its publication date', async () => {
    findFirst.mockResolvedValue({
      ...baseListing,
      status: ListingStatus.PAUSED,
      pausedReason: 'Paused by the owner.',
    });
    update.mockResolvedValue(baseListing);

    await service.reactivate('owner-id', 'listing-id');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ListingStatus.ACTIVE,
          pausedReason: null,
          publishedAt: baseListing.publishedAt,
        }),
      }),
    );
  });

  it('rejects reactivation when the listing is not paused', async () => {
    findFirst.mockResolvedValue(baseListing);

    await expect(
      service.reactivate('owner-id', 'listing-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('resubmits a rejected listing for review', async () => {
    findFirst.mockResolvedValue({
      ...baseListing,
      status: ListingStatus.REJECTED,
      rejectionReason: 'Missing evidence.',
      publishedAt: null,
    });
    update.mockResolvedValue({
      ...baseListing,
      status: ListingStatus.PENDING_REVIEW,
      rejectionReason: null,
      publishedAt: null,
    });

    await service.resubmit('owner-id', 'listing-id');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: ListingStatus.PENDING_REVIEW,
          rejectionReason: null,
        },
      }),
    );
  });

  it('rejects resubmission when the listing is not rejected', async () => {
    findFirst.mockResolvedValue(baseListing);

    await expect(
      service.resubmit('owner-id', 'listing-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('closes a non-closed listing', async () => {
    findFirst.mockResolvedValue(baseListing);
    update.mockResolvedValue({ ...baseListing, status: ListingStatus.CLOSED });

    await service.close('owner-id', 'listing-id');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ListingStatus.CLOSED,
          closedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects closing an already closed listing', async () => {
    findFirst.mockResolvedValue({
      ...baseListing,
      status: ListingStatus.CLOSED,
      closedAt: new Date('2026-08-02T00:00:00.000Z'),
    });

    await expect(service.close('owner-id', 'listing-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('soft deletes by closing the listing and setting deletedAt', async () => {
    findFirst.mockResolvedValue(baseListing);
    update.mockResolvedValue(baseListing);

    await expect(service.softDelete('owner-id', 'listing-id')).resolves.toEqual({
      deleted: true,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ListingStatus.CLOSED,
          closedAt: expect.any(Date),
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('public reads require active and non-deleted listings', async () => {
    findFirst.mockResolvedValue(baseListing);

    await service.findPublicById('listing-id');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'listing-id',
          status: ListingStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    );
  });

  it('does not expose a listing when the public eligibility query finds nothing', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.findPublicById('listing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
