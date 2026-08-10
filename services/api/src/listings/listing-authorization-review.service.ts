import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PrivateStorageService } from '../common/storage/private-storage.interface';
import { PRIVATE_STORAGE_SERVICE } from '../common/storage/storage.tokens';
import { DatabaseService } from '../database/database.service';
import { ListingAuthorizationStatus } from '../generated/prisma/enums';

const REVIEWABLE_STATUSES = new Set<ListingAuthorizationStatus>([
  ListingAuthorizationStatus.SUBMITTED,
  ListingAuthorizationStatus.UNDER_REVIEW,
]);

@Injectable()
export class ListingAuthorizationReviewService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  async getLatestForAdmin(listingId: string) {
    const submission =
      await this.database.listingAuthorizationSubmission.findFirst({
        where: {
          listingId,
          deletedAt: null,
          listing: {
            deletedAt: null,
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        select: {
          id: true,
          listingId: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: true,
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
      });

    if (!submission) {
      throw new NotFoundException(
        'Listing authorization submission not found.',
      );
    }

    return submission;
  }

  async readEvidence(
    adminId: string,
    listingId: string,
    submissionId: string,
    evidenceId: string,
  ) {
    const evidence =
      await this.database.listingAuthorizationEvidence.findFirst({
        where: {
          id: evidenceId,
          submissionId,
          deletedAt: null,
          submission: {
            listingId,
            deletedAt: null,
            listing: {
              deletedAt: null,
            },
          },
        },
        select: {
          id: true,
          type: true,
          objectKey: true,
          mimeType: true,
        },
      });

    if (!evidence) {
      throw new NotFoundException('Listing authorization evidence not found.');
    }

    const buffer = await this.privateStorage.read(evidence.objectKey);

    await this.database.adminActionLog.create({
      data: {
        adminId,
        action: 'LISTING_AUTHORIZATION_EVIDENCE_VIEWED',
        targetType: 'LISTING_AUTHORIZATION_EVIDENCE',
        targetId: evidence.id,
        metadata: {
          listingId,
          submissionId,
          evidenceType: evidence.type,
        },
      },
    });

    return {
      buffer,
      mimeType: evidence.mimeType,
    };
  }

  approve(
    adminId: string,
    listingId: string,
    submissionId: string,
    outcome: {
      relationshipVerified: boolean;
      landlordAuthorizationVerified: boolean;
    },
  ) {
    if (!outcome.relationshipVerified) {
      throw new BadRequestException(
        'An approved authorization review must verify the advertiser relationship to the listing.',
      );
    }

    return this.decide(
      adminId,
      listingId,
      submissionId,
      ListingAuthorizationStatus.APPROVED,
      undefined,
      outcome,
    );
  }

  requestCorrection(
    adminId: string,
    listingId: string,
    submissionId: string,
    reason: string,
  ) {
    return this.decide(
      adminId,
      listingId,
      submissionId,
      ListingAuthorizationStatus.CORRECTION_REQUIRED,
      this.normalizeReason(reason, 'Correction reason'),
    );
  }

  reject(
    adminId: string,
    listingId: string,
    submissionId: string,
    reason: string,
  ) {
    return this.decide(
      adminId,
      listingId,
      submissionId,
      ListingAuthorizationStatus.REJECTED,
      this.normalizeReason(reason, 'Rejection reason'),
    );
  }

  private async decide(
    adminId: string,
    listingId: string,
    submissionId: string,
    decision: ListingAuthorizationStatus,
    reason?: string,
    outcome?: {
      relationshipVerified: boolean;
      landlordAuthorizationVerified: boolean;
    },
  ) {
    return this.database.$transaction(
      async (transaction) => {
        const current =
          await transaction.listingAuthorizationSubmission.findFirst({
            where: {
              id: submissionId,
              listingId,
              deletedAt: null,
              listing: {
                deletedAt: null,
              },
            },
            select: {
              id: true,
              status: true,
              listing: {
                select: {
                  landlordApprovalRequired: true,
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
                    },
                  },
                },
              },
            },
          });

        if (!current) {
          throw new NotFoundException(
            'Listing authorization submission not found.',
          );
        }

        if (!REVIEWABLE_STATUSES.has(current.status)) {
          throw new BadRequestException(
            'Only submitted or in-review authorization evidence can be decided.',
          );
        }

        if (current.listing.authorizationSubmissions[0]?.id !== submissionId) {
          throw new BadRequestException(
            'Only the latest listing authorization submission can be decided.',
          );
        }

        if (
          decision === ListingAuthorizationStatus.APPROVED &&
          current.listing.landlordApprovalRequired === true &&
          outcome?.landlordAuthorizationVerified !== true
        ) {
          throw new BadRequestException(
            'This listing requires verified landlord authorization before the evidence can be approved.',
          );
        }

        const reviewedAt = new Date();
        const submission =
          await transaction.listingAuthorizationSubmission.update({
            where: {
              id: submissionId,
            },
            data: {
              status: decision,
              reviewedAt,
              reviewedBy: adminId,
              reviewReason: reason ?? null,
              relationshipVerified:
                decision === ListingAuthorizationStatus.APPROVED
                  ? outcome?.relationshipVerified
                  : null,
              landlordAuthorizationVerified:
                decision === ListingAuthorizationStatus.APPROVED
                  ? outcome?.landlordAuthorizationVerified
                  : null,
            },
            select: {
              id: true,
              listingId: true,
              status: true,
              submittedAt: true,
              reviewedAt: true,
              reviewedBy: true,
              reviewReason: true,
              relationshipVerified: true,
              landlordAuthorizationVerified: true,
            },
          });

        const action =
          decision === ListingAuthorizationStatus.APPROVED
            ? 'LISTING_AUTHORIZATION_APPROVED'
            : decision === ListingAuthorizationStatus.CORRECTION_REQUIRED
              ? 'LISTING_AUTHORIZATION_CORRECTION_REQUESTED'
              : 'LISTING_AUTHORIZATION_REJECTED';

        await transaction.adminActionLog.create({
          data: {
            adminId,
            action,
            targetType: 'LISTING_AUTHORIZATION_SUBMISSION',
            targetId: submissionId,
            reason: reason ?? null,
            metadata: {
              listingId,
              previousStatus: current.status,
              decision,
              relationshipVerified:
                decision === ListingAuthorizationStatus.APPROVED
                  ? outcome?.relationshipVerified
                  : null,
              landlordAuthorizationVerified:
                decision === ListingAuthorizationStatus.APPROVED
                  ? outcome?.landlordAuthorizationVerified
                  : null,
            },
          },
        });

        return submission;
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private normalizeReason(reason: string, label: string): string {
    const normalized = reason.trim();

    if (!normalized) {
      throw new BadRequestException(`${label} is required.`);
    }

    if (normalized.length > 1000) {
      throw new BadRequestException(`${label} cannot exceed 1000 characters.`);
    }

    return normalized;
  }
}
