import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ListingMapper } from '../common/mappers/listing.mapper';
import { DatabaseService } from '../database/database.service';
import {
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingStatus,
  ListingType,
  UserStatus,
} from '../generated/prisma/enums';

const moderationListingRelations = {
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

const moderationGateRelations = {
  ...moderationListingRelations,
  privateLocation: true,
  publicLocation: true,
  user: {
    include: {
      profile: true,
      trustScore: true,
      verification: {
        include: {
          identitySubmissions: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              submittedAt: 'desc' as const,
            },
            take: 1,
          },
        },
      },
    },
  },
  authorizationSubmissions: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      submittedAt: 'desc' as const,
    },
    take: 1,
  },
};

@Injectable()
export class ListingModerationService {
  constructor(private readonly database: DatabaseService) {}

  listQueue() {
    return this.database.listing.findMany({
      where: {
        status: ListingStatus.PENDING_REVIEW,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'asc',
      },
      select: {
        id: true,
        type: true,
        title: true,
        city: true,
        area: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            status: true,
            profile: {
              select: {
                displayName: true,
              },
            },
            verification: {
              select: {
                identitySubmissions: {
                  where: {
                    deletedAt: null,
                  },
                  orderBy: {
                    submittedAt: 'desc',
                  },
                  take: 1,
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
        privateLocation: {
          select: {
            id: true,
          },
        },
        publicLocation: {
          select: {
            id: true,
          },
        },
        authorizationSubmissions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            submittedAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            relationshipVerified: true,
            landlordAuthorizationVerified: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });
  }

  async getReviewDetail(listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        description: true,
        city: true,
        area: true,
        county: true,
        postalDistrict: true,
        propertyType: true,
        monthlyPriceCents: true,
        landlordApprovalRequired: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            profile: {
              select: {
                displayName: true,
                fullName: true,
                dateOfBirth: true,
                nationality: true,
              },
            },
            verification: {
              select: {
                identitySubmissions: {
                  where: {
                    deletedAt: null,
                  },
                  orderBy: {
                    submittedAt: 'desc',
                  },
                  take: 1,
                  select: {
                    id: true,
                    status: true,
                    documentType: true,
                    reviewedAt: true,
                  },
                },
              },
            },
          },
        },
        privateLocation: true,
        publicLocation: true,
        photos: {
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
            url: true,
            position: true,
          },
        },
        authorizationSubmissions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            submittedAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            reviewReason: true,
            relationshipVerified: true,
            landlordAuthorizationVerified: true,
            evidence: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                createdAt: 'asc',
              },
              select: {
                id: true,
                type: true,
                mimeType: true,
                sizeBytes: true,
                originalFileName: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const revisions = await this.database.listingRevision.findMany({
      where: {
        listingId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        classification: true,
        changedFields: true,
        before: true,
        after: true,
        statusBefore: true,
        statusAfter: true,
        createdAt: true,
      },
    });

    return {
      ...listing,
      revisions,
    };
  }

  async approve(adminId: string, listingId: string, expectedUpdatedAt: string) {
    const expectedTimestamp = new Date(expectedUpdatedAt);

    if (Number.isNaN(expectedTimestamp.getTime())) {
      throw new BadRequestException('A valid expectedUpdatedAt is required.');
    }

    return this.database.$transaction(
      async (transaction) => {
        const currentListing = await transaction.listing.findFirst({
          where: {
            id: listingId,
            deletedAt: null,
          },
          include: moderationGateRelations,
        });

        if (!currentListing) {
          throw new NotFoundException('Listing not found.');
        }

        this.assertPublishable(currentListing, expectedTimestamp);

        const identity =
          currentListing.user.verification?.identitySubmissions[0];
        const authorization = currentListing.authorizationSubmissions[0];

        const listing = await transaction.listing.update({
          where: {
            id: listingId,
          },
          data: {
            status: ListingStatus.ACTIVE,
            rejectionReason: null,
            pausedReason: null,
            publishedAt: new Date(),
          },
          include: moderationListingRelations,
        });

        await transaction.adminActionLog.create({
          data: {
            adminId,
            action: 'LISTING_APPROVED',
            targetType: 'LISTING',
            targetId: listingId,
            metadata: {
              previousStatus: currentListing.status,
              reviewedListingUpdatedAt: currentListing.updatedAt.toISOString(),
              identitySubmissionId: identity?.id,
              authorizationSubmissionId: authorization?.id,
              relationshipVerified: authorization?.relationshipVerified,
              landlordAuthorizationVerified:
                authorization?.landlordAuthorizationVerified,
            },
          },
        });

        return ListingMapper.toOwnerResponse(listing);
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  requestCorrection(adminId: string, listingId: string, reason: string) {
    return this.unpublishDecision(
      adminId,
      listingId,
      reason,
      'LISTING_CORRECTION_REQUESTED',
    );
  }

  reject(adminId: string, listingId: string, reason: string) {
    return this.unpublishDecision(
      adminId,
      listingId,
      reason,
      'LISTING_REJECTED',
    );
  }

  private async unpublishDecision(
    adminId: string,
    listingId: string,
    reason: string,
    action: 'LISTING_CORRECTION_REQUESTED' | 'LISTING_REJECTED',
  ) {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new BadRequestException('Reason is required.');
    }

    if (normalizedReason.length > 1000) {
      throw new BadRequestException('Reason cannot exceed 1000 characters.');
    }

    return this.database.$transaction(async (transaction) => {
      const currentListing = await transaction.listing.findFirst({
        where: {
          id: listingId,
          deletedAt: null,
        },
        include: moderationListingRelations,
      });

      if (!currentListing) {
        throw new NotFoundException('Listing not found.');
      }

      if (currentListing.status !== ListingStatus.PENDING_REVIEW) {
        throw new BadRequestException(
          'Only listings pending review can receive a moderation decision.',
        );
      }

      const listing = await transaction.listing.update({
        where: {
          id: listingId,
        },
        data: {
          status: ListingStatus.REJECTED,
          rejectionReason: normalizedReason,
          pausedReason: null,
          publishedAt: null,
        },
        include: moderationListingRelations,
      });

      await transaction.adminActionLog.create({
        data: {
          adminId,
          action,
          targetType: 'LISTING',
          targetId: listingId,
          reason: normalizedReason,
          metadata: {
            previousStatus: currentListing.status,
            outcome:
              action === 'LISTING_CORRECTION_REQUESTED'
                ? 'CORRECTION_REQUIRED'
                : 'REJECTED',
          },
        },
      });

      return ListingMapper.toOwnerResponse(listing);
    });
  }

  private assertPublishable(
    listing: {
      status: ListingStatus;
      type: ListingType;
      title: string;
      description: string;
      city: string | null;
      area: string | null;
      propertyType: unknown;
      monthlyPriceCents: number | null;
      landlordApprovalRequired: boolean | null;
      updatedAt: Date;
      privateLocation: unknown;
      publicLocation: unknown;
      photos: unknown[];
      user: {
        status: UserStatus;
        verification: {
          identitySubmissions: Array<{
            id: string;
            status: IdentityVerificationStatus;
          }>;
        } | null;
      };
      authorizationSubmissions: Array<{
        id: string;
        status: ListingAuthorizationStatus;
        relationshipVerified: boolean | null;
        landlordAuthorizationVerified: boolean | null;
      }>;
    },
    expectedUpdatedAt: Date,
  ): void {
    if (listing.status !== ListingStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only listings pending review can be approved.',
      );
    }

    if (listing.type === ListingType.WANTED) {
      throw new BadRequestException(
        'Wanted listings are not publishable in Beta 1.',
      );
    }

    if (listing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new BadRequestException(
        'The listing changed after the reviewed version. Reload it before approval.',
      );
    }

    if (listing.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'The advertiser account must be active before publication.',
      );
    }

    const identity = listing.user.verification?.identitySubmissions[0];
    if (identity?.status !== IdentityVerificationStatus.APPROVED) {
      throw new BadRequestException(
        'Approved advertiser identity is required before publication.',
      );
    }

    if (!listing.privateLocation || !listing.publicLocation) {
      throw new BadRequestException(
        'Complete private and approximate public location are required before publication.',
      );
    }

    if (
      !listing.title.trim() ||
      !listing.description.trim() ||
      !listing.city ||
      !listing.area ||
      !listing.propertyType ||
      listing.monthlyPriceCents === null
    ) {
      throw new BadRequestException(
        'The listing is incomplete and cannot be published.',
      );
    }

    if (listing.photos.length === 0) {
      throw new BadRequestException(
        'At least one listing photo is required before publication.',
      );
    }

    const authorization = listing.authorizationSubmissions[0];
    if (
      authorization?.status !== ListingAuthorizationStatus.APPROVED ||
      authorization.relationshipVerified !== true
    ) {
      throw new BadRequestException(
        'Approved relationship-to-property evidence is required before publication.',
      );
    }

    if (
      listing.landlordApprovalRequired === true &&
      authorization.landlordAuthorizationVerified !== true
    ) {
      throw new BadRequestException(
        'Verified landlord authorization is required for this listing.',
      );
    }
  }
}
