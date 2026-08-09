import {
  AdvertisedSpaceType,
  BathroomType,
  BillsIncludedType,
  KitchenAmenity,
  ListingStatus,
  ListingType,
  PropertyOccupancyType,
  PropertyType,
  RoomType,
} from '../generated/prisma/enums';
import {
  hasCriticalListingChanges,
  shouldReturnListingToReview,
} from './listing-edit-policy';

const baseListing = {
  status: ListingStatus.ACTIVE,
  type: ListingType.RENTAL,
  city: 'Dublin',
  area: 'Dublin 8',
  propertyType: PropertyType.SINGLE_ROOM,
  propertyOccupancyType: PropertyOccupancyType.SHARED_PROPERTY,
  advertisedSpaceType: AdvertisedSpaceType.PRIVATE,
  bedroomCount: 3,
  bathroomCount: 2,
  roomType: RoomType.SINGLE,
  bedType: null,
  maxOccupants: 1,
  peopleSharingSpace: 0,
  bathroomType: BathroomType.SHARED,
  peopleSharingBathroom: 3,
  currentResidentCount: 2,
  householdGenderComposition: null,
  monthlyPriceCents: 90000,
  depositAmountCents: 90000,
  billsIncludedType: BillsIncludedType.NO,
  estimatedMonthlyBillsCents: 12000,
  firstRentAdvanceCents: 90000,
  extraCostsNote: null,
  landlordLivesHere: false,
  formalContract: true,
  landlordApprovalRequired: false,
  proofOfIncomeRequired: false,
  proofOfEmploymentRequired: false,
  priorReferenceRequired: false,
  childrenFamiliesAllowed: true,
  studentsAllowed: true,
  couplesAllowed: false,
  petsAllowed: false,
  smokingAllowed: false,
  availableFrom: new Date('2026-09-01T00:00:00.000Z'),
  availableUntil: null,
  minimumStayDays: 90,
  exchangePreference: null,
};

describe('listing edit policy', () => {
  it('keeps minor copy and amenity changes out of moderation', () => {
    expect(
      hasCriticalListingChanges(baseListing, {
        title: 'Updated title',
        description: 'Updated description',
        houseRules: 'Updated rules',
        transportInfo: 'LUAS nearby',
        kitchenAmenities: [KitchenAmenity.OVEN, KitchenAmenity.KETTLE],
      }),
    ).toBe(false);

    expect(
      shouldReturnListingToReview(baseListing, {
        title: 'Updated title',
      }),
    ).toBe(false);
  });

  it('returns an active listing to review after a price change', () => {
    expect(
      shouldReturnListingToReview(baseListing, {
        monthlyPriceCents: 95000,
      }),
    ).toBe(true);
  });

  it('returns a paused approved listing to review after an availability change', () => {
    expect(
      shouldReturnListingToReview(
        { ...baseListing, status: ListingStatus.PAUSED },
        { availableFrom: '2026-10-01T00:00:00.000Z' },
      ),
    ).toBe(true);
  });

  it.each([
    ['propertyOccupancyType', PropertyOccupancyType.ENTIRE_PROPERTY],
    ['advertisedSpaceType', AdvertisedSpaceType.SHARED],
    ['bedroomCount', 4],
    ['bathroomCount', 1],
    ['maxOccupants', 2],
    ['peopleSharingSpace', 1],
    ['bathroomType', BathroomType.PRIVATE],
    ['peopleSharingBathroom', 2],
    ['currentResidentCount', 3],
    ['minimumStayDays', 180],
  ] as const)(
    'returns an approved listing to review after structural change to %s',
    (field, value) => {
      expect(
        shouldReturnListingToReview(baseListing, {
          [field]: value,
        }),
      ).toBe(true);
    },
  );

  it('does not trigger review when a critical field is submitted unchanged', () => {
    expect(
      shouldReturnListingToReview(baseListing, {
        monthlyPriceCents: 90000,
        availableFrom: '2026-09-01T00:00:00.000Z',
        propertyOccupancyType: PropertyOccupancyType.SHARED_PROPERTY,
      }),
    ).toBe(false);
  });

  it('does not bypass the explicit resubmission flow for rejected listings', () => {
    expect(
      shouldReturnListingToReview(
        { ...baseListing, status: ListingStatus.REJECTED },
        { monthlyPriceCents: 95000 },
      ),
    ).toBe(false);
  });

  it('treats authorization-relevant changes as critical', () => {
    expect(
      shouldReturnListingToReview(baseListing, {
        landlordLivesHere: true,
      }),
    ).toBe(true);

    expect(
      shouldReturnListingToReview(baseListing, {
        landlordApprovalRequired: true,
      }),
    ).toBe(true);
  });

  it('treats exchange preference changes as critical for approved exchange listings', () => {
    const exchangeListing = {
      ...baseListing,
      type: ListingType.EXCHANGE,
      exchangePreference: {
        desiredCity: 'Dublin',
        desiredAreas: ['Dublin 8', 'Dublin 6'],
        desiredMinPriceCents: 80000,
        desiredMaxPriceCents: 120000,
        desiredPropertyTypes: [
          PropertyType.SINGLE_ROOM,
          PropertyType.APARTMENT,
        ],
        desiredMoveDate: new Date('2026-09-15T00:00:00.000Z'),
      },
    };

    expect(
      shouldReturnListingToReview(exchangeListing, {
        desiredAreas: ['Dublin 4'],
      }),
    ).toBe(true);
  });

  it('does not treat exchange array reordering as a material change', () => {
    const exchangeListing = {
      ...baseListing,
      type: ListingType.EXCHANGE,
      exchangePreference: {
        desiredCity: 'Dublin',
        desiredAreas: ['Dublin 8', 'Dublin 6'],
        desiredMinPriceCents: 80000,
        desiredMaxPriceCents: 120000,
        desiredPropertyTypes: [
          PropertyType.SINGLE_ROOM,
          PropertyType.APARTMENT,
        ],
        desiredMoveDate: new Date('2026-09-15T00:00:00.000Z'),
      },
    };

    expect(
      shouldReturnListingToReview(exchangeListing, {
        desiredAreas: ['Dublin 6', 'Dublin 8'],
        desiredPropertyTypes: [
          PropertyType.APARTMENT,
          PropertyType.SINGLE_ROOM,
        ],
      }),
    ).toBe(false);
  });
});
