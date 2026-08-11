import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingStatus,
  ReportStatus,
} from '../generated/prisma/enums';

const PREVIEW_LIMIT = 10;
const IDENTITY_REVIEWABLE_STATUSES: IdentityVerificationStatus[] = [
  IdentityVerificationStatus.SUBMITTED,
  IdentityVerificationStatus.UNDER_REVIEW,
];
const AUTHORIZATION_REVIEWABLE_STATUSES: ListingAuthorizationStatus[] = [
  ListingAuthorizationStatus.SUBMITTED,
  ListingAuthorizationStatus.UNDER_REVIEW,
];
const REPORT_REVIEWABLE_STATUSES: ReportStatus[] = [
  ReportStatus.OPEN,
  ReportStatus.UNDER_REVIEW,
];

@Injectable()
export class AdminOperationsService {
  constructor(private readonly database: DatabaseService) {}

  async getSummary() {
    const identityWhere = {
      deletedAt: null,
      status: {
        in: IDENTITY_REVIEWABLE_STATUSES,
      },
    };

    const authorizationWhere = {
      deletedAt: null,
      status: {
        in: AUTHORIZATION_REVIEWABLE_STATUSES,
      },
      listing: {
        deletedAt: null,
      },
    };

    const listingWhere = {
      status: ListingStatus.PENDING_REVIEW,
      deletedAt: null,
    };

    const reportWhere = {
      status: {
        in: REPORT_REVIEWABLE_STATUSES,
      },
    };

    const [
      identityCount,
      authorizationCount,
      listingCount,
      reportCount,
      identities,
      authorizations,
      listings,
      reports,
    ] = await Promise.all([
      this.database.identityVerificationSubmission.count({
        where: identityWhere,
      }),
      this.database.listingAuthorizationSubmission.count({
        where: authorizationWhere,
      }),
      this.database.listing.count({ where: listingWhere }),
      this.database.report.count({ where: reportWhere }),
      this.database.identityVerificationSubmission.findMany({
        where: identityWhere,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          documentType: true,
          status: true,
          submittedAt: true,
          verification: {
            select: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.database.listingAuthorizationSubmission.findMany({
        where: authorizationWhere,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          listingId: true,
          status: true,
          submittedAt: true,
          listing: {
            select: {
              id: true,
              title: true,
              city: true,
              area: true,
            },
          },
        },
      }),
      this.database.listing.findMany({
        where: listingWhere,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          type: true,
          title: true,
          city: true,
          area: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      this.database.report.findMany({
        where: reportWhere,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: PREVIEW_LIMIT,
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
          reportedUser: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      generatedAt: new Date(),
      previewLimit: PREVIEW_LIMIT,
      totals: {
        identityReviews: identityCount,
        listingAuthorizationReviews: authorizationCount,
        listingModerationReviews: listingCount,
        safetyReports: reportCount,
        pendingWork:
          identityCount + authorizationCount + listingCount + reportCount,
      },
      queues: {
        identityReviews: identities,
        listingAuthorizationReviews: authorizations,
        listingModerationReviews: listings,
        safetyReports: reports,
      },
      routes: {
        identityReviews: '/api/v1/admin/identity-verification/submissions',
        listingAuthorization:
          '/api/v1/admin/listings/:listingId/authorization/latest',
        listingModeration: '/api/v1/admin/listings/review-queue',
        safetyReports: '/api/v1/admin/reports',
      },
    };
  }
}
