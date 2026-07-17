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

      propertyType: listing.propertyType,

      pricing: {
        monthlyPriceCents: listing.monthlyPriceCents,
        depositAmountCents: listing.depositAmountCents,
        currency: 'EUR',
        billsIncludedType: listing.billsIncludedType,
        extraCostsNote: listing.extraCostsNote,
      },

      details: {
        furnished: listing.furnished,
        couplesAllowed: listing.couplesAllowed,
        petsAllowed: listing.petsAllowed,
        smokingAllowed: listing.smokingAllowed,
        genderPreference: listing.genderPreference,
        landlordLivesHere: listing.landlordLivesHere,
        formalContract: listing.formalContract,
        landlordApprovalRequired: listing.landlordApprovalRequired,
      },

      availability: {
        availableFrom: listing.availableFrom,
        availableUntil: listing.availableUntil,
      },

      houseRules: listing.houseRules,
      transportInfo: listing.transportInfo,
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
