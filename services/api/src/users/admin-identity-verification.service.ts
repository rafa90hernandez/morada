import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import type { PrivateStorageService } from '../common/storage/private-storage.interface';
import { PRIVATE_STORAGE_SERVICE } from '../common/storage/storage.tokens';
import { DatabaseService } from '../database/database.service';
import { IdentityVerificationStatus } from '../generated/prisma/enums';

const REVIEWABLE_STATUSES = [
  IdentityVerificationStatus.SUBMITTED,
  IdentityVerificationStatus.UNDER_REVIEW,
] as const;

@Injectable()
export class AdminIdentityVerificationService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  listQueue() {
    return this.database.identityVerificationSubmission.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [...REVIEWABLE_STATUSES],
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
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
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    fullName: true,
                    dateOfBirth: true,
                    nationality: true,
                    hometown: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getSubmission(submissionId: string) {
    const submission =
      await this.database.identityVerificationSubmission.findFirst({
        where: {
          id: submissionId,
          deletedAt: null,
        },
        select: {
          id: true,
          documentType: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          reviewReason: true,
          verification: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      displayName: true,
                      fullName: true,
                      dateOfBirth: true,
                      nationality: true,
                      hometown: true,
                    },
                  },
                },
              },
            },
          },
          evidence: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              type: 'asc',
            },
            select: {
              id: true,
              type: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
        },
      });

    if (!submission) {
      throw new NotFoundException('Identity verification submission not found.');
    }

    return submission;
  }

  async readEvidence(
    adminId: string,
    submissionId: string,
    evidenceId: string,
  ) {
    const evidence = await this.database.identityVerificationEvidence.findFirst({
      where: {
        id: evidenceId,
        submissionId,
        deletedAt: null,
        submission: {
          deletedAt: null,
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
      throw new NotFoundException('Identity verification evidence not found.');
    }

    const buffer = await this.privateStorage.read(evidence.objectKey);

    await this.database.adminActionLog.create({
      data: {
        adminId,
        action: 'IDENTITY_EVIDENCE_VIEWED',
        targetType: 'IDENTITY_VERIFICATION_EVIDENCE',
        targetId: evidence.id,
        metadata: {
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

  approve(adminId: string, submissionId: string) {
    return this.decide(
      adminId,
      submissionId,
      IdentityVerificationStatus.APPROVED,
    );
  }

  reject(adminId: string, submissionId: string, reason: string) {
    const normalizedReason = this.normalizeReason(reason);

    return this.decide(
      adminId,
      submissionId,
      IdentityVerificationStatus.REJECTED,
      normalizedReason,
    );
  }

  private async decide(
    adminId: string,
    submissionId: string,
    decision: IdentityVerificationStatus.APPROVED | IdentityVerificationStatus.REJECTED,
    reason?: string,
  ) {
    return this.database.$transaction(
      async (transaction) => {
        const current =
          await transaction.identityVerificationSubmission.findFirst({
            where: {
              id: submissionId,
              deletedAt: null,
            },
            select: {
              id: true,
              status: true,
              verificationId: true,
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
                    },
                  },
                },
              },
            },
          });

        if (!current) {
          throw new NotFoundException(
            'Identity verification submission not found.',
          );
        }

        if (!REVIEWABLE_STATUSES.includes(current.status as never)) {
          throw new BadRequestException(
            'Only submitted or in-review identity verifications can be decided.',
          );
        }

        if (current.verification.identitySubmissions[0]?.id !== submissionId) {
          throw new BadRequestException(
            'Only the latest identity verification submission can be decided.',
          );
        }

        const reviewedAt = new Date();

        const submission =
          await transaction.identityVerificationSubmission.update({
            where: {
              id: submissionId,
            },
            data: {
              status: decision,
              reviewedAt,
              reviewedBy: adminId,
              reviewReason: reason ?? null,
            },
            select: {
              id: true,
              documentType: true,
              status: true,
              submittedAt: true,
              reviewedAt: true,
              reviewReason: true,
              reviewedBy: true,
            },
          });

        await transaction.verification.update({
          where: {
            id: current.verificationId,
          },
          data: {
            documentStatus: decision,
            documentReviewedAt: reviewedAt,
          },
        });

        await transaction.adminActionLog.create({
          data: {
            adminId,
            action:
              decision === IdentityVerificationStatus.APPROVED
                ? 'IDENTITY_VERIFICATION_APPROVED'
                : 'IDENTITY_VERIFICATION_REJECTED',
            targetType: 'IDENTITY_VERIFICATION_SUBMISSION',
            targetId: submissionId,
            reason: reason ?? null,
            metadata: {
              previousStatus: current.status,
              decision,
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

  private normalizeReason(reason: string): string {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new BadRequestException('Rejection reason is required.');
    }

    if (normalizedReason.length > 1000) {
      throw new BadRequestException(
        'Rejection reason cannot exceed 1000 characters.',
      );
    }

    return normalizedReason;
  }
}
