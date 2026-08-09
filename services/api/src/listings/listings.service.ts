import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ListingMapper } from '../common/mappers/listing.mapper';
import { DatabaseService } from '../database/database.service';
import {
  BathroomType,
  BillsIncludedType,
  ListingStatus,
  ListingType,
} from '../generated/prisma/enums';
import { CreateListingDto } from './dto/create-listing.dto';
import { MyListingsQueryDto } from './dto/my-listings-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { shouldReturnListingToReview } from './listing-edit-policy';

const listingRelations = {
  user: {
    include: {
      profile: true,
      trustScore: true,
    },
  },
  photos: {
    orderBy: {
      position: 'asc' as const,
    },
  },
  exchangePreference: true,
  transportOptions: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
};

@Injectable()
export class ListingsService {
  constructor(private readonly database: DatabaseService) {}

  async create(userId: string, dto: CreateListingDto) {
    this.validateListing(dto);

    const listing = await this.database.listing.create({
      data: {
        userId,
        type: dto.type,
        status: ListingStatus.PENDING_REVIEW,
        title: dto.title,
        description: dto.description,
        city: dto.city,
        area: dto.area,
        propertyType: dto.propertyType,
        propertyOccupancyType: dto.propertyOccupancyType,
        advertisedSpaceType: dto.advertisedSpaceType,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
        roomType: dto.roomType,
        bedType: dto.bedType,
        maxOccupants: dto.maxOccupants,
        peopleSharingSpace: dto.peopleSharingSpace,
        bathroomType: dto.bathroomType,
        peopleSharingBathroom: dto.peopleSharingBathroom,
        currentResidentCount: dto.currentResidentCount,
        householdGenderComposition: dto.householdGenderComposition,
        monthlyPriceCents: dto.monthlyPriceCents,
        depositAmountCents: dto.depositAmountCents,
        billsIncludedType: dto.billsIncludedType,
        estimatedMonthlyBillsCents: dto.estimatedMonthlyBillsCents,
        firstRentAdvanceCents: dto.firstRentAdvanceCents,
        extraCostsNote: dto.extraCostsNote,
        furnished: dto.furnished,
        couplesAllowed: dto.couplesAllowed,
        petsAllowed: dto.petsAllowed,
        smokingAllowed: dto.smokingAllowed,
        landlordLivesHere: dto.landlordLivesHere,
        childrenFamiliesAllowed: dto.childrenFamiliesAllowed,
        studentsAllowed: dto.studentsAllowed,
        formalContract: dto.formalContract,
        landlordApprovalRequired: dto.landlordApprovalRequired,
        proofOfIncomeRequired: dto.proofOfIncomeRequired,
        proofOfEmploymentRequired: dto.proofOfEmploymentRequired,
        priorReferenceRequired: dto.priorReferenceRequired,
        otherRequirementsNote: dto.otherRequirementsNote,
        availableFrom: dto.availableFrom
          ? new Date(dto.availableFrom)
          : undefined,
        availableUntil: dto.availableUntil
          ? new Date(dto.availableUntil)
          : undefined,
        minimumStayDays: dto.minimumStayDays,
        floorNumber: dto.floorNumber,
        isGroundFloor: dto.isGroundFloor,
        hasLift: dto.hasLift,
        stepFreeAccess: dto.stepFreeAccess,
        accessibleEntrance: dto.accessibleEntrance,
        adaptedBathroom: dto.adaptedBathroom,
        wheelchairSpace: dto.wheelchairSpace,
        accessibleParking: dto.accessibleParking,
        accessibilityOtherNote: dto.accessibilityOtherNote,
        heatingType: dto.heatingType,
        internetAvailable: dto.internetAvailable,
        wifiAvailable: dto.wifiAvailable,
        internetIncludedInBills: dto.internetIncludedInBills,
        internetSpeedMbps: dto.internetSpeedMbps,
        internetProvider: dto.internetProvider,
        washingMachine: dto.washingMachine,
        dryer: dto.dryer,
        laundrySharedBuilding: dto.laundrySharedBuilding,
        laundryExtraCost: dto.laundryExtraCost,
        kitchenAmenities: dto.kitchenAmenities ?? [],
        outdoorAmenities: dto.outdoorAmenities ?? [],
        carParkingAvailable: dto.carParkingAvailable,
        motorbikeParkingAvailable: dto.motorbikeParkingAvailable,
        bicycleParkingAvailable: dto.bicycleParkingAvailable,
        parkingPaid: dto.parkingPaid,
        parkingSecure: dto.parkingSecure,
        partiesAllowed: dto.partiesAllowed,
        visitorsAllowed: dto.visitorsAllowed,
        quietHoursNote: dto.quietHoursNote,
        houseRules: dto.houseRules,
        transportInfo: dto.transportInfo,
        transportOptions: dto.transportOptions?.length
          ? {
              create: dto.transportOptions,
            }
          : undefined,
        exchangePreference:
          dto.type === ListingType.EXCHANGE
            ? {
                create: {
                  desiredCity: dto.desiredCity,
                  desiredAreas: dto.desiredAreas ?? [],
                  desiredMinPriceCents: dto.desiredMinPriceCents,
                  desiredMaxPriceCents: dto.desiredMaxPriceCents,
                  desiredPropertyTypes: dto.desiredPropertyTypes ?? [],
                  desiredMoveDate: dto.desiredMoveDate
                    ? new Date(dto.desiredMoveDate)
                    : undefined,
                  notes: dto.exchangeNotes,
                },
              }
            : undefined,
      },
      include: listingRelations,
    });

    return ListingMapper.toOwnerResponse(listing);
  }

  async findPublicById(id: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id,
        status: ListingStatus.ACTIVE,
        deletedAt: null,
      },
      include: listingRelations,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return ListingMapper.toResponse(listing);
  }

  async findMine(userId: string, query: MyListingsQueryDto) {
    const listings = await this.database.listing.findMany({
      where: {
        userId,
        deletedAt: null,
        status: query.status,
        type: query.type,
      },
      include: listingRelations,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return listings.map((listing) => ListingMapper.toOwnerResponse(listing));
  }

  async findMineById(userId: string, id: string) {
    const listing = await this.getOwnedListing(userId, id);

    return ListingMapper.toOwnerResponse(listing);
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    const currentListing = await this.getOwnedListing(userId, id);

    if (currentListing.status === ListingStatus.CLOSED) {
      throw new BadRequestException('Closed listings cannot be edited.');
    }

    const mergedListing = {
      type: dto.type ?? currentListing.type,
      city: dto.city ?? currentListing.city ?? undefined,
      area: dto.area ?? currentListing.area ?? undefined,
      propertyType:
        dto.propertyType ?? currentListing.propertyType ?? undefined,
      monthlyPriceCents:
        dto.monthlyPriceCents ?? currentListing.monthlyPriceCents ?? undefined,
      billsIncludedType:
        dto.billsIncludedType ?? currentListing.billsIncludedType ?? undefined,
      estimatedMonthlyBillsCents:
        dto.estimatedMonthlyBillsCents ??
        currentListing.estimatedMonthlyBillsCents ??
        undefined,
      bathroomType:
        dto.bathroomType ?? currentListing.bathroomType ?? undefined,
      peopleSharingBathroom:
        dto.peopleSharingBathroom ??
        currentListing.peopleSharingBathroom ??
        undefined,
      isGroundFloor:
        dto.isGroundFloor ?? currentListing.isGroundFloor ?? undefined,
      floorNumber: dto.floorNumber ?? currentListing.floorNumber ?? undefined,
      desiredCity:
        dto.desiredCity ??
        currentListing.exchangePreference?.desiredCity ??
        undefined,
      desiredAreas:
        dto.desiredAreas ??
        currentListing.exchangePreference?.desiredAreas ??
        [],
    };

    this.validateListing(mergedListing);

    const requiresReview = shouldReturnListingToReview(currentListing, dto);

    const listing = await this.database.listing.update({
      where: {
        id,
      },
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        city: dto.city,
        area: dto.area,
        propertyType: dto.propertyType,
        propertyOccupancyType: dto.propertyOccupancyType,
        advertisedSpaceType: dto.advertisedSpaceType,
        bedroomCount: dto.bedroomCount,
        bathroomCount: dto.bathroomCount,
        roomType: dto.roomType,
        bedType: dto.bedType,
        maxOccupants: dto.maxOccupants,
        peopleSharingSpace: dto.peopleSharingSpace,
        bathroomType: dto.bathroomType,
        peopleSharingBathroom: dto.peopleSharingBathroom,
        currentResidentCount: dto.currentResidentCount,
        householdGenderComposition: dto.householdGenderComposition,
        monthlyPriceCents: dto.monthlyPriceCents,
        depositAmountCents: dto.depositAmountCents,
        billsIncludedType: dto.billsIncludedType,
        estimatedMonthlyBillsCents: dto.estimatedMonthlyBillsCents,
        firstRentAdvanceCents: dto.firstRentAdvanceCents,
        extraCostsNote: dto.extraCostsNote,
        furnished: dto.furnished,
        couplesAllowed: dto.couplesAllowed,
        petsAllowed: dto.petsAllowed,
        smokingAllowed: dto.smokingAllowed,
        landlordLivesHere: dto.landlordLivesHere,
        childrenFamiliesAllowed: dto.childrenFamiliesAllowed,
        studentsAllowed: dto.studentsAllowed,
        formalContract: dto.formalContract,
        landlordApprovalRequired: dto.landlordApprovalRequired,
        proofOfIncomeRequired: dto.proofOfIncomeRequired,
        proofOfEmploymentRequired: dto.proofOfEmploymentRequired,
        priorReferenceRequired: dto.priorReferenceRequired,
        otherRequirementsNote: dto.otherRequirementsNote,
        availableFrom: dto.availableFrom
          ? new Date(dto.availableFrom)
          : undefined,
        availableUntil: dto.availableUntil
          ? new Date(dto.availableUntil)
          : undefined,
        minimumStayDays: dto.minimumStayDays,
        floorNumber: dto.floorNumber,
        isGroundFloor: dto.isGroundFloor,
        hasLift: dto.hasLift,
        stepFreeAccess: dto.stepFreeAccess,
        accessibleEntrance: dto.accessibleEntrance,
        adaptedBathroom: dto.adaptedBathroom,
        wheelchairSpace: dto.wheelchairSpace,
        accessibleParking: dto.accessibleParking,
        accessibilityOtherNote: dto.accessibilityOtherNote,
        heatingType: dto.heatingType,
        internetAvailable: dto.internetAvailable,
        wifiAvailable: dto.wifiAvailable,
        internetIncludedInBills: dto.internetIncludedInBills,
        internetSpeedMbps: dto.internetSpeedMbps,
        internetProvider: dto.internetProvider,
        washingMachine: dto.washingMachine,
        dryer: dto.dryer,
        laundrySharedBuilding: dto.laundrySharedBuilding,
        laundryExtraCost: dto.laundryExtraCost,
        kitchenAmenities: dto.kitchenAmenities,
        outdoorAmenities: dto.outdoorAmenities,
        carParkingAvailable: dto.carParkingAvailable,
        motorbikeParkingAvailable: dto.motorbikeParkingAvailable,
        bicycleParkingAvailable: dto.bicycleParkingAvailable,
        parkingPaid: dto.parkingPaid,
        parkingSecure: dto.parkingSecure,
        partiesAllowed: dto.partiesAllowed,
        visitorsAllowed: dto.visitorsAllowed,
        quietHoursNote: dto.quietHoursNote,
        houseRules: dto.houseRules,
        transportInfo: dto.transportInfo,
        transportOptions:
          dto.transportOptions !== undefined
            ? {
                deleteMany: {},
                create: dto.transportOptions,
              }
            : undefined,
        ...(requiresReview
          ? {
              status: ListingStatus.PENDING_REVIEW,
              rejectionReason: null,
              pausedReason: null,
              publishedAt: null,
            }
          : {}),
        exchangePreference:
          mergedListing.type === ListingType.EXCHANGE
            ? {
                upsert: {
                  create: {
                    desiredCity: dto.desiredCity,
                    desiredAreas: dto.desiredAreas ?? [],
                    desiredMinPriceCents: dto.desiredMinPriceCents,
                    desiredMaxPriceCents: dto.desiredMaxPriceCents,
                    desiredPropertyTypes: dto.desiredPropertyTypes ?? [],
                    desiredMoveDate: dto.desiredMoveDate
                      ? new Date(dto.desiredMoveDate)
                      : undefined,
                    notes: dto.exchangeNotes,
                  },
                  update: {
                    desiredCity: dto.desiredCity,
                    desiredAreas: dto.desiredAreas,
                    desiredMinPriceCents: dto.desiredMinPriceCents,
                    desiredMaxPriceCents: dto.desiredMaxPriceCents,
                    desiredPropertyTypes: dto.desiredPropertyTypes,
                    desiredMoveDate: dto.desiredMoveDate
                      ? new Date(dto.desiredMoveDate)
                      : undefined,
                    notes: dto.exchangeNotes,
                  },
                },
              }
            : currentListing.exchangePreference
              ? {
                  delete: true,
                }
              : undefined,
      },
      include: listingRelations,
    });

    return ListingMapper.toOwnerResponse(listing);
  }

  async pause(userId: string, id: string) {
    const currentListing = await this.getOwnedListing(userId, id);

    if (currentListing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Only active listings can be paused.');
    }

    const listing = await this.database.listing.update({
      where: { id },
      data: {
        status: ListingStatus.PAUSED,
        pausedReason: 'Paused by the owner.',
      },
      include: listingRelations,
    });

    return ListingMapper.toOwnerResponse(listing);
  }

  async reactivate(userId: string, id: string) {
    const currentListing = await this.getOwnedListing(userId, id);

    if (currentListing.status !== ListingStatus.PAUSED) {
      throw new BadRequestException('Only paused listings can be reactivated.');
    }

    const listing = await this.database.listing.update({
      where: { id },
      data: {
        status: ListingStatus.ACTIVE,
        pausedReason: null,
        publishedAt: currentListing.publishedAt ?? new Date(),
      },
      include: listingRelations,
    });

    return ListingMapper.toOwnerResponse(listing);
  }

  async resubmit(userId: string, id: string) {
    const currentListing = await this.getOwnedListing(userId, id);

    if (currentListing.status !== ListingStatus.REJECTED) {
      throw new BadRequestException(
        'Only rejected listings can be resubmitted.',
      );
    }

    const listing = await this.database.listing.update({
      where: { id },
      data: {
        status: ListingStatus.PENDING_REVIEW,
        rejectionReason: null,
      },
      include: listingRelations,
    });

    return ListingMapper.toOwnerResponse(listing);
  }

  async close(userId: string, id: string) {
    const currentListing = await this.getOwnedListing(userId, id);

    if (currentListing.status === ListingStatus.CLOSED) {
      throw new BadRequestException('Listing is already closed.');
    }

    const listing = await this.database.listing.update({
      where: { id },
      data: {
        status: ListingStatus.CLOSED,
        closedAt: new Date(),
      },
      include: listingRelations,
    });

    return ListingMapper.toOwnerResponse(listing);
  }

  async softDelete(userId: string, id: string) {
    const currentListing = await this.getOwnedListing(userId, id);

    await this.database.listing.update({
      where: { id },
      data: {
        status: ListingStatus.CLOSED,
        closedAt: currentListing.closedAt ?? new Date(),
        deletedAt: new Date(),
      },
    });

    return {
      deleted: true,
    };
  }

  private async getOwnedListing(userId: string, id: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: listingRelations,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return listing;
  }

  private validateListing(
    dto: Pick<
      CreateListingDto,
      | 'type'
      | 'city'
      | 'area'
      | 'propertyType'
      | 'monthlyPriceCents'
      | 'billsIncludedType'
      | 'estimatedMonthlyBillsCents'
      | 'bathroomType'
      | 'peopleSharingBathroom'
      | 'isGroundFloor'
      | 'floorNumber'
      | 'desiredCity'
      | 'desiredAreas'
    >,
  ): void {
    if (dto.type !== ListingType.WANTED) {
      if (!dto.city || !dto.area || !dto.propertyType) {
        throw new BadRequestException(
          'City, area and property type are required for this listing type.',
        );
      }

      if (
        dto.monthlyPriceCents === undefined ||
        dto.monthlyPriceCents === null
      ) {
        throw new BadRequestException(
          'Monthly price is required for this listing type.',
        );
      }
    }

    if (dto.type === ListingType.WANTED) {
      if (
        !dto.city ||
        dto.monthlyPriceCents === undefined ||
        dto.monthlyPriceCents === null
      ) {
        throw new BadRequestException(
          'Desired city and budget are required for wanted listings.',
        );
      }
    }

    if (
      dto.billsIncludedType === BillsIncludedType.NO &&
      dto.estimatedMonthlyBillsCents === undefined
    ) {
      throw new BadRequestException(
        'Estimated monthly bills are required when bills are not included.',
      );
    }

    if (
      dto.bathroomType === BathroomType.PRIVATE &&
      dto.peopleSharingBathroom !== undefined &&
      dto.peopleSharingBathroom > 0
    ) {
      throw new BadRequestException(
        'A private bathroom cannot have people sharing the bathroom.',
      );
    }

    if (dto.isGroundFloor === true && dto.floorNumber !== undefined) {
      if (dto.floorNumber !== 0) {
        throw new BadRequestException(
          'Ground-floor listings must use floor number 0 when a floor number is supplied.',
        );
      }
    }

    if (
      dto.type === ListingType.EXCHANGE &&
      !dto.desiredCity &&
      (!dto.desiredAreas || dto.desiredAreas.length === 0)
    ) {
      throw new BadRequestException(
        'Desired city or desired areas are required for exchange listings.',
      );
    }
  }
}
