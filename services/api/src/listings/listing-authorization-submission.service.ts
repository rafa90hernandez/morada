import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';

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
  ListingAuthorizationEvidenceType,
  ListingAuthorizationStatus,
  ListingType,
} from '../generated/prisma/enums';
import { ListingAuthorizationEvidenceProcessor } from './listing-authorization-evidence.processor';

export type ListingAuthorizationSubmissionFile = {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  originalFileName?: string;
};

export type ListingAuthorizationEvidenceUpload = {
  type: ListingAuthorizationEvidenceType;
  file: ListingAuthorizationSubmissionFile;
};

export type CreateListingAuthorizationSubmissionCommand = {
  authenticatedUserId: string;
  listingId: string;
  evidence: ListingAuthorizationEvidenceUpload[];
};

type StoredEvidence = {
  type: ListingAuthorizationEvidenceType;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  originalFileName: string | null;
};

const BLOCKING_STATUSES = new Set<ListingAuthorizationStatus>([
  ListingAuthorizationStatus.SUBMITTED,
  ListingAuthorizationStatus.UNDER_REVIEW,
  ListingAuthorizationStatus.APPROVED,
]);

@Injectable()
export class ListingAuthorizationSubmissionService {
  private readonly logger = new Logger(
    ListingAuthorizationSubmissionService.name,
  );

  constructor(
    private readonly database: DatabaseService,
    private readonly evidenceProcessor: ListingAuthorizationEvidenceProcessor,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  async submit(command: CreateListingAuthorizationSubmissionCommand) {
    this.requireEvidence(command.evidence);

    const listing = await this.findOwnedListing(
      command.authenticatedUserId,
      command.listingId,
    );
    this.assertEligibleListing(listing);

    const latest = await this.findLatestSubmission(command.listingId);
    this.assertCanSubmit(latest?.status);

    const submissionId = randomUUID();
    const storedEvidence: StoredEvidence[] = [];

    try {
      for (const evidence of command.evidence) {
        storedEvidence.push(
          await this.processAndStore(
            command.authenticatedUserId,
            command.listingId,
            submissionId,
            evidence,
          ),
        );
      }

      const submittedAt = new Date();

      return await this.database.$transaction(
        async (transaction) => {
          const currentListing = await transaction.listing.findFirst({
            where: {
              id: command.listingId,
              userId: command.authenticatedUserId,
              deletedAt: null,
            },
            select: {
              id: true,
              type: true,
              user: {
                select: {
                  status: true,
                },
              },
            },
          });

          if (!currentListing) {
            throw new NotFoundException('Listing not found.');
          }

          this.assertEligibleListing(currentListing);

          const currentSubmission =
            await transaction.listingAuthorizationSubmission.findFirst({
              where: {
                listingId: command.listingId,
                deletedAt: null,
              },
              orderBy: {
                submittedAt: 'desc',
              },
              select: {
                status: true,
              },
            });

          this.assertCanSubmit(currentSubmission?.status);

          return transaction.listingAuthorizationSubmission.create({
            data: {
              id: submissionId,
              listingId: command.listingId,
              status: ListingAuthorizationStatus.SUBMITTED,
              submittedAt,
              evidence: {
                create: storedEvidence.map((evidence) => ({
                  type: evidence.type,
                  objectKey: evidence.objectKey,
                  mimeType: evidence.mimeType,
                  sizeBytes: evidence.sizeBytes,
                  sha256: evidence.sha256,
                  originalFileName: evidence.originalFileName,
                })),
              },
            },
            select: {
              id: true,
              listingId: true,
              status: true,
              submittedAt: true,
              evidence: {
                orderBy: {
                  createdAt: 'asc',
                },
                select: {
                  id: true,
                  type: true,
                  mimeType: true,
                  sizeBytes: true,
                  originalFileName: true,
                },
              },
            },
          });
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

  async getLatestForOwner(authenticatedUserId: string, listingId: string) {
    await this.findOwnedListing(authenticatedUserId, listingId);

    const submission = await this.database.listingAuthorizationSubmission.findFirst({
      where: {
        listingId,
        deletedAt: null,
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
          },
        },
      },
    });

    return submission;
  }

  private async findOwnedListing(userId: string, listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return listing;
  }

  private async findLatestSubmission(listingId: string) {
    return this.database.listingAuthorizationSubmission.findFirst({
      where: {
        listingId,
        deletedAt: null,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      select: {
        status: true,
      },
    });
  }

  private assertEligibleListing(listing: {
    type: ListingType;
    user: {
      status: string;
    };
  }): void {
    if (listing.user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Only active accounts can submit listing authorization evidence.',
      );
    }

    if (listing.type === ListingType.WANTED) {
      throw new BadRequestException(
        'Wanted listings do not require right-to-advertise evidence.',
      );
    }
  }

  private assertCanSubmit(status?: ListingAuthorizationStatus): void {
    if (!status) {
      return;
    }

    if (status === ListingAuthorizationStatus.APPROVED) {
      throw new ConflictException(
        'Listing authorization is already approved. A new attempt requires an explicit re-verification flow.',
      );
    }

    if (BLOCKING_STATUSES.has(status)) {
      throw new ConflictException(
        'A listing authorization submission is already awaiting review.',
      );
    }
  }

  private requireEvidence(evidence: ListingAuthorizationEvidenceUpload[]): void {
    if (evidence.length === 0) {
      throw new BadRequestException(
        'At least one right-to-advertise evidence file is required.',
      );
    }

    if (evidence.length > 5) {
      throw new BadRequestException(
        'A listing authorization submission can contain at most five files.',
      );
    }
  }

  private async processAndStore(
    userId: string,
    listingId: string,
    submissionId: string,
    evidence: ListingAuthorizationEvidenceUpload,
  ): Promise<StoredEvidence> {
    const processed = await this.evidenceProcessor.process({
      buffer: evidence.file.buffer,
      mimeType: evidence.file.mimeType,
      sizeBytes: evidence.file.sizeBytes,
    });

    const objectKey = [
      'listing-authorization',
      userId,
      listingId,
      submissionId,
      `${evidence.type.toLowerCase()}-${randomUUID()}.${processed.extension}`,
    ].join('/');

    const stored = await this.privateStorage.upload({
      key: objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    return {
      type: evidence.type,
      objectKey: stored.key,
      mimeType: processed.mimeType,
      sizeBytes: processed.sizeBytes,
      sha256: createHash('sha256').update(processed.buffer).digest('hex'),
      originalFileName: this.normalizeFileName(evidence.file.originalFileName),
    };
  }

  private normalizeFileName(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = basename(value)
      .replace(/[\u0000-\u001f\u007f]/g, '_')
      .trim()
      .slice(0, 180);

    return normalized || null;
  }

  private async rollbackStoredEvidence(
    storedEvidence: StoredEvidence[],
  ): Promise<void> {
    await Promise.all(
      storedEvidence.map(async (evidence) => {
        try {
          await this.privateStorage.delete(evidence.objectKey);
        } catch (error: unknown) {
          this.logger.error(
            `Failed to roll back private listing authorization object ${evidence.objectKey}.`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }),
    );
  }
}
