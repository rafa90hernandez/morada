import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingType } from '../generated/prisma/enums';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingMapper } from '../common/mappers/listing.mapper';

@Injectable()
export class ListingsService {
  constructor(private readonly database: DatabaseService) {}

  async create(userId: string, dto: CreateListingDto) {
    this.validateCreateListing(dto);

    const listing = await this.database.listing.create({
      data: {
        userId,
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
      include: {
        user: {
          include: {
            profile: true,
            trustScore: true,
          },
        },
        photos: true,
        exchangePreference: true,
      },
    });

    return ListingMapper.toResponse(listing);
  }

  async findById(id: string) {
    const listing = await this.database.listing.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
            trustScore: true,
          },
        },
        photos: {
          orderBy: {
            position: 'asc',
          },
        },
        exchangePreference: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return ListingMapper.toResponse(listing);
  }

  private validateCreateListing(dto: CreateListingDto) {
    if (dto.type !== ListingType.WANTED) {
      if (!dto.city || !dto.area || !dto.propertyType) {
        throw new BadRequestException(
          'City, area and property type are required for this listing type.',
        );
      }

      if (!dto.monthlyPriceCents) {
        throw new BadRequestException(
          'Monthly price is required for this listing type.',
        );
      }
    }

    if (dto.type === ListingType.WANTED) {
      if (!dto.city || !dto.monthlyPriceCents) {
        throw new BadRequestException(
          'Desired city and budget are required for wanted listings.',
        );
      }
    }

    if (dto.type === ListingType.EXCHANGE) {
      if (
        !dto.desiredCity &&
        (!dto.desiredAreas || dto.desiredAreas.length === 0)
      ) {
        throw new BadRequestException(
          'Desired city or desired areas are required for exchange listings.',
        );
      }
    }
  }
}
