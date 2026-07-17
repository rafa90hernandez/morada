import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ListingMapper } from '../common/mappers/listing.mapper';
import { DatabaseService } from '../database/database.service';
import { ListingStatus, ListingType } from '../generated/prisma/enums';
import { CreateListingDto } from './dto/create-listing.dto';
import { MyListingsQueryDto } from './dto/my-listings-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

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
        monthlyPriceCents: dto.monthlyPriceCents,
        depositAmountCents: dto.depositAmountCents,
        billsIncludedType: dto.billsIncludedType,
        extraCostsNote: dto.extraCostsNote,
        furnished: dto.furnished,
        couplesAllowed: dto.couplesAllowed,
        petsAllowed: dto.petsAllowed,
        smokingAllowed: dto.smokingAllowed,
        genderPreference: dto.genderPreference,
        landlordLivesHere: dto.landlordLivesHere,
        formalContract: dto.formalContract,
        landlordApprovalRequired: dto.landlordApprovalRequired,
        availableFrom: dto.availableFrom
          ? new Date(dto.availableFrom)
          : undefined,
        availableUntil: dto.availableUntil
          ? new Date(dto.availableUntil)
          : undefined,
        houseRules: dto.houseRules,
        transportInfo: dto.transportInfo,

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

    const mustReturnToReview = [
      ListingStatus.DRAFT,
      ListingStatus.ACTIVE,
      ListingStatus.PAUSED,
      ListingStatus.REJECTED,
      ListingStatus.PENDING_REVIEW,
    ].includes(currentListing.status);

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
        monthlyPriceCents: dto.monthlyPriceCents,
        depositAmountCents: dto.depositAmountCents,
        billsIncludedType: dto.billsIncludedType,
        extraCostsNote: dto.extraCostsNote,
        furnished: dto.furnished,
        couplesAllowed: dto.couplesAllowed,
        petsAllowed: dto.petsAllowed,
        smokingAllowed: dto.smokingAllowed,
        genderPreference: dto.genderPreference,
        landlordLivesHere: dto.landlordLivesHere,
        formalContract: dto.formalContract,
        landlordApprovalRequired: dto.landlordApprovalRequired,
        availableFrom: dto.availableFrom
          ? new Date(dto.availableFrom)
          : undefined,
        availableUntil: dto.availableUntil
          ? new Date(dto.availableUntil)
          : undefined,
        houseRules: dto.houseRules,
        transportInfo: dto.transportInfo,

        status: mustReturnToReview ? ListingStatus.PENDING_REVIEW : undefined,

        rejectionReason: null,
        pausedReason: null,
        publishedAt: mustReturnToReview ? null : undefined,

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

    if (currentListing.userId !== userId) {
      throw new ForbiddenException('You cannot delete this listing.');
    }

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
