import {
  BillsIncludedType,
  GenderPreference,
  ListingStatus,
  ListingType,
  PropertyType,
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
  monthlyPriceCents: 90000,
  depositAmountCents: 90000,
  billsIncludedType: BillsIncludedType.NO,
  extraCostsNote: null,
  genderPreference: GenderPreference.ANY,
  landlordLivesHere: false,
  formalContract: true,
  landlordApprovalRequired: false,
  availableFrom: new Date('2026-09-01T00:00:00.000Z'),
  availableUntil: null,
  exchangePreference: null,
};

describe('listing edit policy', () => {
  it('keeps minor copy changes out of moderation', () => {
    expect(
      hasCriticalListingChanges(baseListing, {
        title: 'Updated title',
        description: 'Updated description',
        houseRules: 'Updated rules',
        transportInfo: 'LUAS nearby',
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

  it('does not trigger review when a critical field is submitted unchanged', () => {
    expect(
      shouldReturnListingToReview(baseListing, {
        monthlyPriceCents: 90000,
        availableFrom: '2026-09-01T00:00:00.000Z',
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
        desiredAreas: ['Dublin 8'],
        desiredMinPriceCents: 80000,
        desiredMaxPriceCents: 120000,
        desiredPropertyTypes: [PropertyType.SINGLE_ROOM],
        desiredMoveDate: new Date('2026-09-15T00:00:00.000Z'),
      },
    };

    expect(
      shouldReturnListingToReview(exchangeListing, {
        desiredAreas: ['Dublin 6'],
      }),
    ).toBe(true);
  });
});
