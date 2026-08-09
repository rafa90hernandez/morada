import { createHash, randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { PrivateStorageService } from '../common/storage/private-storage.interface';
import { PRIVATE_STORAGE_SERVICE } from '../common/storage/storage.tokens';
import { DatabaseService } from '../database/database.service';
import {
  IdentityDocumentType,
  IdentityEvidenceType,
  IdentityVerificationStatus,
} from '../generated/prisma/enums';
import { IdentityEvidenceImageProcessor } from './identity-evidence-image.processor';
import { getAdultEligibility } from './policies/adult-eligibility.policy';

export type IdentitySubmissionFile = {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
};

export type CreateIdentitySubmissionCommand = {
  authenticatedUserId: string;
  documentType: IdentityDocumentType;
  documentFront?: IdentitySubmissionFile;
  documentBack?: IdentitySubmissionFile;
  selfieWithDocument?: IdentitySubmissionFile;
};

type StoredEvidence = {
  type: IdentityEvidenceType;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

const BLOCKING_STATUSES = new Set<IdentityVerificationStatus>([
  IdentityVerificationStatus.SUBMITTED,
  IdentityVerificationStatus.UNDER_REVIEW,
  IdentityVerificationStatus.APPROVED,
]);

@Injectable()
export class IdentityVerificationSubmissionService {
  private readonly logger = new Logger(
    IdentityVerificationSubmissionService.name,
  );

  constructor(
    private readonly database: DatabaseService,
    private readonly imageProcessor: IdentityEvidenceImageProcessor,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  async submit(command: CreateIdentitySubmissionCommand) {
    this.requireCompleteEvidence(command);

    const verification = await this.findVerificationContext(
      command.authenticatedUserId,
    );

    this.assertEligibleAccount(verification);
    this.assertCanSubmit(verification.identitySubmissions[0]?.status);

    const submissionId = randomUUID();
    const storedEvidence: StoredEvidence[] = [];

    try {
      storedEvidence.push(
        await this.processAndStore(
          command.authenticatedUserId,
          submissionId,
          IdentityEvidenceType.DOCUMENT_FRONT,
          command.documentFront!,
        ),
      );

      if (command.documentBack) {
        storedEvidence.push(
          await this.processAndStore(
            command.authenticatedUserId,
            submissionId,
            IdentityEvidenceType.DOCUMENT_BACK,
            command.documentBack,
          ),
        );
      }

      storedEvidence.push(
        await this.processAndStore(
          command.authenticatedUserId,
          submissionId,
          IdentityEvidenceType.SELFIE_WITH_DOCUMENT,
          command.selfieWithDocument!,
        ),
      );

      const submittedAt = new Date();

      return await this.database.$transaction(
        async (transaction) => {
          const current = await transaction.verification.findUnique({
            where: {
              userId: command.authenticatedUserId,
            },
            select: {
              id: true,
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
          });

          if (!current) {
            throw new NotFoundException('Verification record not found.');
          }

          this.assertCanSubmit(current.identitySubmissions[0]?.status);

          const submission =
            await transaction.identityVerificationSubmission.create({
              data: {
                id: submissionId,
                verificationId: current.id,
                documentType: command.documentType,
                status: IdentityVerificationStatus.SUBMITTED,
                submittedAt,
                evidence: {
                  create: storedEvidence.map((evidence) => ({
                    type: evidence.type,
                    objectKey: evidence.objectKey,
                    mimeType: evidence.mimeType,
                    sizeBytes: evidence.sizeBytes,
                    sha256: evidence.sha256,
                  })),
                },
              },
              select: {
                id: true,
                documentType: true,
                status: true,
                submittedAt: true,
                evidence: {
                  orderBy: {
                    type: 'asc',
                  },
                  select: {
                    type: true,
                  },
                },
              },
            });

          await transaction.verification.update({
            where: {
              id: current.id,
            },
            data: {
              documentStatus: IdentityVerificationStatus.SUBMITTED,
              documentSubmittedAt: submittedAt,
              documentReviewedAt: null,
            },
          });

          return submission;
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error: unknown) {
      await this.rollbackStoredEvidence(storedEvidence);
      throw error;
    }
  }

  private async findVerificationContext(authenticatedUserId: string) {
    const verification = await this.database.verification.findUnique({
      where: {
        userId: authenticatedUserId,
      },
      select: {
        id: true,
        user: {
          select: {
            status: true,
            profile: {
              select: {
                dateOfBirth: true,
              },
            },
          },
        },
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
    });

    if (!verification) {
      throw new NotFoundException('Verification record not found.');
    }

    return verification;
  }

  private assertEligibleAccount(
    verification: Awaited<ReturnType<typeof this.findVerificationContext>>,
  ): void {
    if (verification.user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Only active accounts can submit identity verification.',
      );
    }

    const eligibility = getAdultEligibility(
      verification.user.profile?.dateOfBirth,
    );

    if (!eligibility.isEligible) {
      throw new ForbiddenException(
        'Adult eligibility is required before identity verification.',
      );
    }
  }

  private assertCanSubmit(status?: IdentityVerificationStatus): void {
    if (!status) {
      return;
    }

    if (status === IdentityVerificationStatus.APPROVED) {
      throw new ConflictException(
        'Identity is already approved. A new submission requires an explicit re-verification flow.',
      );
    }

    if (BLOCKING_STATUSES.has(status)) {
      throw new ConflictException(
        'An identity verification submission is already awaiting review.',
      );
    }
  }

  private requireCompleteEvidence(command: CreateIdentitySubmissionCommand) {
    if (!command.documentFront) {
      throw new BadRequestException('Identity document image is required.');
    }

    if (!command.selfieWithDocument) {
      throw new BadRequestException('Selfie with identity document is required.');
    }
  }

  private async processAndStore(
    userId: string,
    submissionId: string,
    type: IdentityEvidenceType,
    file: IdentitySubmissionFile,
  ): Promise<StoredEvidence> {
    const processed = await this.imageProcessor.process({
      buffer: file.buffer,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    });

    const objectKey = [
      'identity-verification',
      userId,
      submissionId,
      `${type.toLowerCase()}-${randomUUID()}.jpg`,
    ].join('/');

    const stored = await this.privateStorage.upload({
      key: objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    return {
      type,
      objectKey: stored.key,
      mimeType: processed.mimeType,
      sizeBytes: processed.sizeBytes,
      sha256: createHash('sha256').update(processed.buffer).digest('hex'),
    };
  }

  private async rollbackStoredEvidence(
    storedEvidence: StoredEvidence[],
  ): Promise<void> {
    await Promise.all(
      storedEvidence.map(async (evidence) => {
        try {
          await this.privateStorage.delete(evidence.objectKey);
        } catch (rollbackError: unknown) {
          this.logger.error(
            `Failed to rollback private identity evidence: ${evidence.objectKey}`,
            rollbackError instanceof Error ? rollbackError.stack : undefined,
          );
        }
      }),
    );
  }
}
