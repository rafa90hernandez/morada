import type { Prisma } from '../generated/prisma/client';
import { ListingAuthorizationStatus } from '../generated/prisma/enums';

export const publicListingCardSelect = {
  id: true,
  type: true,
  title: true,
  city: true,
  area: true,
  county: true,
  postalDistrict: true,
  propertyType: true,
  propertyOccupancyType: true,
  advertisedSpaceType: true,
  bathroomType: true,
  bedroomCount: true,
  bathroomCount: true,
  monthlyPriceCents: true,
  billsIncludedType: true,
  furnished: true,
  couplesAllowed: true,
  petsAllowed: true,
  smokingAllowed: true,
  availableFrom: true,
  minimumStayDays: true,
  trustScore: true,
  publishedAt: true,
  photos: {
    orderBy: { position: 'asc' as const },
    take: 1,
    select: {
      id: true,
      url: true,
      position: true,
    },
  },
  publicLocation: {
    select: {
      latitude: true,
      longitude: true,
      radiusMeters: true,
      approximationVersion: true,
    },
  },
} as const;

export const publicListingDetailSelect = {
  ...publicListingCardSelect,
  description: true,
  roomType: true,
  bedType: true,
  maxOccupants: true,
  peopleSharingSpace: true,
  peopleSharingBathroom: true,
  currentResidentCount: true,
  householdGenderComposition: true,
  depositAmountCents: true,
  estimatedMonthlyBillsCents: true,
  firstRentAdvanceCents: true,
  extraCostsNote: true,
  landlordLivesHere: true,
  childrenFamiliesAllowed: true,
  studentsAllowed: true,
  formalContract: true,
  landlordApprovalRequired: true,
  proofOfIncomeRequired: true,
  proofOfEmploymentRequired: true,
  priorReferenceRequired: true,
  otherRequirementsNote: true,
  availableUntil: true,
  floorNumber: true,
  isGroundFloor: true,
  hasLift: true,
  stepFreeAccess: true,
  accessibleEntrance: true,
  adaptedBathroom: true,
  wheelchairSpace: true,
  accessibleParking: true,
  accessibilityOtherNote: true,
  heatingType: true,
  internetAvailable: true,
  wifiAvailable: true,
  internetIncludedInBills: true,
  internetSpeedMbps: true,
  internetProvider: true,
  washingMachine: true,
  dryer: true,
  laundrySharedBuilding: true,
  laundryExtraCost: true,
  kitchenAmenities: true,
  outdoorAmenities: true,
  carParkingAvailable: true,
  motorbikeParkingAvailable: true,
  bicycleParkingAvailable: true,
  parkingPaid: true,
  parkingSecure: true,
  partiesAllowed: true,
  visitorsAllowed: true,
  quietHoursNote: true,
  houseRules: true,
  transportOptions: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      mode: true,
      stopName: true,
      lineName: true,
      walkingMinutes: true,
      distanceMeters: true,
    },
  },
  photos: {
    orderBy: { position: 'asc' as const },
    select: {
      id: true,
      url: true,
      position: true,
    },
  },
  user: {
    select: {
      profile: {
        select: {
          displayName: true,
          profilePhotoUrl: true,
          nationality: true,
          hometown: true,
        },
      },
      verification: {
        select: {
          documentStatus: true,
        },
      },
    },
  },
  authorizationSubmissions: {
    where: { deletedAt: null },
    orderBy: { submittedAt: 'desc' as const },
    take: 1,
    select: {
      status: true,
      relationshipVerified: true,
      landlordAuthorizationVerified: true,
    },
  },
} as const;

export type PublicListingCardRow = Prisma.ListingGetPayload<{
  select: typeof publicListingCardSelect;
}>;

export type PublicListingDetailRow = Prisma.ListingGetPayload<{
  select: typeof publicListingDetailSelect;
}>;

export function toPublicListingCard(
  listing: PublicListingCardRow,
  expiresAt: Date,
) {
  return {
    id: listing.id,
    type: listing.type,
    title: listing.title,
    location: {
      city: listing.city,
      area: listing.area,
      county: listing.county,
      postalDistrict: listing.postalDistrict,
      approximate: listing.publicLocation,
    },
    accommodation: {
      propertyType: listing.propertyType,
      occupancyType: listing.propertyOccupancyType,
      advertisedSpaceType: listing.advertisedSpaceType,
      bathroomType: listing.bathroomType,
      bedroomCount: listing.bedroomCount,
      bathroomCount: listing.bathroomCount,
      furnished: listing.furnished,
    },
    pricing: {
      monthlyPriceCents: listing.monthlyPriceCents,
      currency: 'EUR',
      billsIncludedType: listing.billsIncludedType,
    },
    suitability: {
      couplesAllowed: listing.couplesAllowed,
      petsAllowed: listing.petsAllowed,
      smokingAllowed: listing.smokingAllowed,
    },
    availability: {
      availableFrom: listing.availableFrom,
      minimumStayDays: listing.minimumStayDays,
    },
    coverPhoto: listing.photos[0] ?? null,
    trustScore: listing.trustScore,
    publishedAt: listing.publishedAt,
    expiresAt,
  };
}

export function toPublicListingDetail(
  listing: PublicListingDetailRow,
  expiresAt: Date,
) {
  const authorization = listing.authorizationSubmissions[0];
  const authorizationApproved =
    authorization?.status === ListingAuthorizationStatus.APPROVED;

  return {
    ...toPublicListingCard(listing, expiresAt),
    description: listing.description,
    space: {
      roomType: listing.roomType,
      bedType: listing.bedType,
      maxOccupants: listing.maxOccupants,
      peopleSharingSpace: listing.peopleSharingSpace,
      peopleSharingBathroom: listing.peopleSharingBathroom,
    },
    household: {
      currentResidentCount: listing.currentResidentCount,
      genderComposition: listing.householdGenderComposition,
      landlordLivesHere: listing.landlordLivesHere,
      childrenFamiliesAllowed: listing.childrenFamiliesAllowed,
      studentsAllowed: listing.studentsAllowed,
    },
    pricingDetail: {
      depositAmountCents: listing.depositAmountCents,
      estimatedMonthlyBillsCents: listing.estimatedMonthlyBillsCents,
      firstRentAdvanceCents: listing.firstRentAdvanceCents,
      extraCostsNote: listing.extraCostsNote,
    },
    requirements: {
      formalContract: listing.formalContract,
      landlordApprovalRequired: listing.landlordApprovalRequired,
      proofOfIncomeRequired: listing.proofOfIncomeRequired,
      proofOfEmploymentRequired: listing.proofOfEmploymentRequired,
      priorReferenceRequired: listing.priorReferenceRequired,
      otherRequirementsNote: listing.otherRequirementsNote,
    },
    availabilityDetail: {
      availableUntil: listing.availableUntil,
    },
    property: {
      floorNumber: listing.floorNumber,
      isGroundFloor: listing.isGroundFloor,
      hasLift: listing.hasLift,
      heatingType: listing.heatingType,
    },
    accessibility: {
      stepFreeAccess: listing.stepFreeAccess,
      accessibleEntrance: listing.accessibleEntrance,
      adaptedBathroom: listing.adaptedBathroom,
      wheelchairSpace: listing.wheelchairSpace,
      accessibleParking: listing.accessibleParking,
      otherNote: listing.accessibilityOtherNote,
    },
    connectivity: {
      internetAvailable: listing.internetAvailable,
      wifiAvailable: listing.wifiAvailable,
      internetIncludedInBills: listing.internetIncludedInBills,
      internetSpeedMbps: listing.internetSpeedMbps,
      internetProvider: listing.internetProvider,
    },
    laundry: {
      washingMachine: listing.washingMachine,
      dryer: listing.dryer,
      sharedBuilding: listing.laundrySharedBuilding,
      extraCost: listing.laundryExtraCost,
    },
    amenities: {
      kitchen: listing.kitchenAmenities,
      outdoor: listing.outdoorAmenities,
    },
    parking: {
      car: listing.carParkingAvailable,
      motorbike: listing.motorbikeParkingAvailable,
      bicycle: listing.bicycleParkingAvailable,
      paid: listing.parkingPaid,
      secure: listing.parkingSecure,
    },
    rules: {
      partiesAllowed: listing.partiesAllowed,
      visitorsAllowed: listing.visitorsAllowed,
      quietHoursNote: listing.quietHoursNote,
      houseRules: listing.houseRules,
    },
    transport: listing.transportOptions,
    photos: listing.photos,
    advertiser: listing.user.profile,
    trust: {
      identityVerified: listing.user.verification?.documentStatus === 'APPROVED',
      relationshipVerified:
        authorizationApproved && authorization.relationshipVerified === true,
      landlordAuthorization: {
        requiredByListing: listing.landlordApprovalRequired === true,
        status:
          authorizationApproved &&
          authorization.landlordAuthorizationVerified === true
            ? 'VERIFIED'
            : 'NOT_VERIFIED',
      },
    },
  };
}
