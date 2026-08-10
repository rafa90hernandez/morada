import { NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingAuthorizationStatus } from '../generated/prisma/enums';
import { PublicListingDetailService } from './public-listing-detail.service';

const now = new Date('2026-08-10T16:30:00.000Z');

function buildPublicRow() {
  return {
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
    description: 'Bright room near public transport.',
    roomType: 'SINGLE',
    bedType: 'SINGLE',
    maxOccupants: 1,
    peopleSharingSpace: 0,
    peopleSharingBathroom: 2,
    currentResidentCount: 2,
    householdGenderComposition: 'MIXED',
    depositAmountCents: 95000,
    estimatedMonthlyBillsCents: 12000,
    firstRentAdvanceCents: 95000,
    extraCostsNote: null,
    landlordLivesHere: false,
    childrenFamiliesAllowed: false,
    studentsAllowed: true,
    formalContract: true,
    landlordApprovalRequired: false,
    proofOfIncomeRequired: false,
    proofOfEmploymentRequired: false,
    priorReferenceRequired: true,
    otherRequirementsNote: null,
    availableUntil: null,
    floorNumber: 1,
    isGroundFloor: false,
    hasLift: false,
    stepFreeAccess: false,
    accessibleEntrance: false,
    adaptedBathroom: false,
    wheelchairSpace: false,
    accessibleParking: false,
    accessibilityOtherNote: null,
    heatingType: 'CENTRAL',
    internetAvailable: true,
    wifiAvailable: true,
    internetIncludedInBills: false,
    internetSpeedMbps: 500,
    internetProvider: null,
    washingMachine: true,
    dryer: false,
    laundrySharedBuilding: false,
    laundryExtraCost: false,
    kitchenAmenities: ['FRIDGE', 'OVEN'],
    outdoorAmenities: [],
    carParkingAvailable: false,
    motorbikeParkingAvailable: false,
    bicycleParkingAvailable: true,
    parkingPaid: false,
    parkingSecure: true,
    partiesAllowed: false,
    visitorsAllowed: true,
    quietHoursNote: null,
    houseRules: 'Respect shared spaces.',
    publicLocation: {
      latitude: 53.34,
      longitude: -6.29,
      radiusMeters: 1500,
      approximationVersion: 'GRID_V1',
    },
    photos: [
      {
        id: 'photo-id',
        url: 'https://example.test/listing.jpg',
        position: 0,
      },
    ],
    transportOptions: [],
    user: {
      profile: {
        displayName: 'Rafael',
        profilePhotoUrl: null,
        nationality: 'Brazilian',
        hometown: 'São Paulo',
      },
      verification: {
        documentStatus: 'APPROVED',
      },
    },
    authorizationSubmissions: [
      {
        status: ListingAuthorizationStatus.APPROVED,
        relationshipVerified: true,
        landlordAuthorizationVerified: false,
      },
    ],
  };
}

describe('PublicListingDetailService', () => {
  const lifecycleFindUnique = jest.fn();
  const listingFindFirst = jest.fn();

  const service = new PublicListingDetailService({
    listingLifecycle: { findUnique: lifecycleFindUnique },
    listing: { findFirst: listingFindFirst },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    lifecycleFindUnique.mockResolvedValue({
      expiresAt: new Date('2026-08-20T16:30:00.000Z'),
    });
    listingFindFirst.mockResolvedValue(buildPublicRow());
  });

  it('returns a stable public detail with precise trust claims', async () => {
    const result = await service.getById('listing-id', now);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'listing-id',
        location: expect.objectContaining({
          approximate: expect.objectContaining({ radiusMeters: 1500 }),
        }),
        advertiser: expect.objectContaining({ displayName: 'Rafael' }),
        trust: {
          identityVerified: true,
          relationshipVerified: true,
          landlordAuthorization: {
            requiredByListing: false,
            status: 'NOT_VERIFIED',
          },
        },
      }),
    );
  });

  it('never selects private address or evidence payload fields', async () => {
    await service.getById('listing-id', now);

    const args = listingFindFirst.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };

    expect(args.select.privateLocation).toBeUndefined();
    expect(args.select.rejectionReason).toBeUndefined();
    expect(args.select.pausedReason).toBeUndefined();

    const authorizationSelect = args.select.authorizationSubmissions as {
      select: Record<string, unknown>;
    };
    expect(authorizationSelect.select.evidence).toBeUndefined();
    expect(authorizationSelect.select.reviewReason).toBeUndefined();
  });

  it('fails closed before querying a listing when lifecycle is expired', async () => {
    lifecycleFindUnique.mockResolvedValue({ expiresAt: now });

    await expect(service.getById('listing-id', now)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(listingFindFirst).not.toHaveBeenCalled();
  });

  it('fails closed when the active public listing no longer exists', async () => {
    listingFindFirst.mockResolvedValue(null);

    await expect(service.getById('listing-id', now)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
