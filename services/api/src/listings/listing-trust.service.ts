import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  ListingAuthorizationStatus,
  ListingStatus,
} from '../generated/prisma/enums';

@Injectable()
export class ListingTrustService {
  constructor(private readonly database: DatabaseService) {}

  async getPublicTrust(listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        status: ListingStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        landlordApprovalRequired: true,
        user: {
          select: {
            verification: {
              select: {
                documentStatus: true,
              },
            },
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
            status: true,
            relationshipVerified: true,
            landlordAuthorizationVerified: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const authorization = listing.authorizationSubmissions[0];
    const authorizationApproved =
      authorization?.status === ListingAuthorizationStatus.APPROVED;

    return {
      listingId: listing.id,
      identityVerified:
        listing.user.verification?.documentStatus === 'APPROVED',
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
    };
  }
}
