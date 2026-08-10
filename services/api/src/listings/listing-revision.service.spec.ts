jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

jest.mock('../common/mappers/listing.mapper', () => ({
  ListingMapper: {
    toOwnerResponse: jest.fn((listing) => listing),
  },
}));

import {
  ListingRevisionClassification,
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
  description: 'Bright room.',
  city: 'Dublin',
  area: 'Dublin 8',
  propertyType: PropertyType.SINGLE_ROOM,
  monthlyPriceCents: 90000,
  billsIncludedType: null,
  estimatedMonthlyBillsCents: null,
  bathroomType: null,
  peopleSharingBathroom: null,
  isGroundFloor: null,
  floorNumber: null,
  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
  closedAt: null,
  deletedAt: null,
  exchangePreference: null,
  transportOptions: [],
  user: {},
  photos: [],
};

describe('ListingsService revision persistence', () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const revisionCreate = jest.fn();
  const transaction = {
    listing: { update },
    listingRevision: { create: revisionCreate },
  };
  const database = {
    listing: {
      findFirst,
      update,
    },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const service = new ListingsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a critical revision in the same transaction as the edit', async () => {
    findFirst.mockResolvedValueOnce(baseListing);
    update.mockResolvedValueOnce({
      ...baseListing,
      monthlyPriceCents: 95000,
      status: ListingStatus.PENDING_REVIEW,
      publishedAt: null,
    });
    revisionCreate.mockResolvedValueOnce({ id: 'revision-id' });

    await service.update('owner-id', 'listing-id', {
      monthlyPriceCents: 95000,
    });

    expect(database.$transaction).toHaveBeenCalledTimes(1);
    expect(revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        listingId: 'listing-id',
        actorUserId: 'owner-id',
        classification: ListingRevisionClassification.CRITICAL,
        changedFields: ['monthlyPriceCents'],
        before: { monthlyPriceCents: 90000 },
        after: { monthlyPriceCents: 95000 },
        statusBefore: ListingStatus.ACTIVE,
        statusAfter: ListingStatus.PENDING_REVIEW,
        previousPublishedAt: baseListing.publishedAt,
      }),
    });
  });

  it('persists a minor revision without sending the listing back to review', async () => {
    findFirst.mockResolvedValueOnce(baseListing);
    update.mockResolvedValueOnce({
      ...baseListing,
      description: 'Updated copy.',
    });
    revisionCreate.mockResolvedValueOnce({ id: 'revision-id' });

    await service.update('owner-id', 'listing-id', {
      description: 'Updated copy.',
    });

    expect(revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        classification: ListingRevisionClassification.MINOR,
        changedFields: ['description'],
        before: {},
        after: {},
        statusBefore: ListingStatus.ACTIVE,
        statusAfter: ListingStatus.ACTIVE,
      }),
    });
  });

  it('does not create audit noise when submitted values are unchanged', async () => {
    findFirst.mockResolvedValueOnce(baseListing);
    database.listing.update.mockResolvedValueOnce(baseListing);

    await service.update('owner-id', 'listing-id', {
      monthlyPriceCents: 90000,
    });

    expect(database.$transaction).not.toHaveBeenCalled();
    expect(revisionCreate).not.toHaveBeenCalled();
    expect(database.listing.update).toHaveBeenCalledTimes(1);
  });
});
