import type { Prisma } from '../../generated/prisma/client';

import { UserMapper } from './user.mapper';

export type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    user: {
      include: {
        profile: true;
        trustScore: true;
      };
    };
    photos: true;
    exchangePreference: true;
    transportOptions: true;
  };
}>;

export class ListingMapper {
  static toResponse(listing: ListingWithRelations) {
    return {
      id: listing.id,
      type: listing.type,
      status: listing.status,
      title: listing.title,
      description: listing.description,

      location: {
        city: listing.city,
        area: listing.area,
      },

      property: {
        propertyType: listing.propertyType,
        occupancyType: listing.propertyOccupancyType,
        bedroomCount: listing.bedroomCount,
        bathroomCount: listing.bathroomCount,
        floorNumber: listing.floorNumber,
        isGroundFloor: listing.isGroundFloor,
        hasLift: listing.hasLift,
        heatingType: listing.heatingType,
      },

      space: {
        advertisedSpaceType: listing.advertisedSpaceType,
        roomType: listing.roomType,
        bedType: listing.bedType,
        maxOccupants: listing.maxOccupants,
        peopleSharingSpace: listing.peopleSharingSpace,
        bathroomType: listing.bathroomType,
        peopleSharingBathroom: listing.peopleSharingBathroom,
      },

      household: {
        currentResidentCount: listing.currentResidentCount,
        genderComposition: listing.householdGenderComposition,
        landlordLivesHere: listing.landlordLivesHere,
        couplesAllowed: listing.couplesAllowed,
        childrenFamiliesAllowed: listing.childrenFamiliesAllowed,
        studentsAllowed: listing.studentsAllowed,
        petsAllowed: listing.petsAllowed,
        smokingAllowed: listing.smokingAllowed,
      },

      pricing: {
        monthlyPriceCents: listing.monthlyPriceCents,
        depositAmountCents: listing.depositAmountCents,
        currency: 'EUR',
        billsIncludedType: listing.billsIncludedType,
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

      availability: {
        availableFrom: listing.availableFrom,
        availableUntil: listing.availableUntil,
        minimumStayDays: listing.minimumStayDays,
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
        furnished: listing.furnished,
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

      accessibility: {
        stepFreeAccess: listing.stepFreeAccess,
        accessibleEntrance: listing.accessibleEntrance,
        adaptedBathroom: listing.adaptedBathroom,
        wheelchairSpace: listing.wheelchairSpace,
        accessibleParking: listing.accessibleParking,
        otherNote: listing.accessibilityOtherNote,
      },

      rules: {
        partiesAllowed: listing.partiesAllowed,
        visitorsAllowed: listing.visitorsAllowed,
        quietHoursNote: listing.quietHoursNote,
        houseRules: listing.houseRules,
      },

      transport: {
        legacyInfo: listing.transportInfo,
        options: listing.transportOptions.map((option) => ({
          id: option.id,
          mode: option.mode,
          stopName: option.stopName,
          lineName: option.lineName,
          walkingMinutes: option.walkingMinutes,
          distanceMeters: option.distanceMeters,
        })),
      },

      trustScore: listing.trustScore,

      photos: [...listing.photos]
        .sort((first, second) => first.position - second.position)
        .map((photo) => ({
          id: photo.id,
          url: photo.url,
          position: photo.position,
        })),

      exchangePreference: listing.exchangePreference
        ? {
            desiredCity: listing.exchangePreference.desiredCity,
            desiredAreas: listing.exchangePreference.desiredAreas,
            desiredMinPriceCents:
              listing.exchangePreference.desiredMinPriceCents,
            desiredMaxPriceCents:
              listing.exchangePreference.desiredMaxPriceCents,
            desiredPropertyTypes:
              listing.exchangePreference.desiredPropertyTypes,
            desiredMoveDate: listing.exchangePreference.desiredMoveDate,
            notes: listing.exchangePreference.notes,
          }
        : null,

      advertiser: UserMapper.toPublicResponse(listing.user),

      publishedAt: listing.publishedAt,
      closedAt: listing.closedAt,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }

  static toOwnerResponse(listing: ListingWithRelations) {
    return {
      ...this.toResponse(listing),
      moderation: {
        rejectionReason: listing.rejectionReason,
        pausedReason: listing.pausedReason,
      },
    };
  }
}
