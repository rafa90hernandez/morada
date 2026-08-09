import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  IdentityDocumentType,
  IdentityEvidenceType,
  IdentityVerificationStatus,
} from '../generated/prisma/enums';
import { IdentityVerificationSubmissionService } from './identity-verification-submission.service';

function file(value: string) {
  const buffer = Buffer.from(value);

  return {
    buffer,
    mimeType: 'image/jpeg',
    sizeBytes: buffer.length,
  };
}

describe('IdentityVerificationSubmissionService', () => {
  const findVerification = jest.fn();
  const transactionFindVerification = jest.fn();
  const createSubmission = jest.fn();
  const updateVerification = jest.fn();

  const transaction = {
    verification: {
      findUnique: transactionFindVerification,
      update: updateVerification,
    },
    identityVerificationSubmission: {
      create: createSubmission,
    },
  };

  const $transaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );

  const database = {
    verification: {
      findUnique: findVerification,
    },
    $transaction,
  };

  const process = jest.fn(async (input: ReturnType<typeof file>) => ({
    buffer: input.buffer,
    mimeType: 'image/jpeg' as const,
    sizeBytes: input.sizeBytes,
  }));

  const upload = jest.fn(async ({ key }: { key: string }) => ({ key }));
  const deleteObject = jest.fn(async () => undefined);

  const service = new IdentityVerificationSubmissionService(
    database as never,
    { process } as never,
    {
      upload,
      delete: deleteObject,
    } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    findVerification.mockResolvedValue({
      id: 'verification-id',
      user: {
        status: 'ACTIVE',
        profile: {
          dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        },
      },
      identitySubmissions: [],
    });

    transactionFindVerification.mockResolvedValue({
      id: 'verification-id',
      identitySubmissions: [],
    });

    createSubmission.mockResolvedValue({
      id: 'submission-id',
      documentType: IdentityDocumentType.PASSPORT,
      status: IdentityVerificationStatus.SUBMITTED,
      submittedAt: new Date('2026-08-09T19:00:00.000Z'),
      evidence: [
        { type: IdentityEvidenceType.DOCUMENT_FRONT },
        { type: IdentityEvidenceType.SELFIE_WITH_DOCUMENT },
      ],
    });
  });

  it('stores complete evidence privately and creates a submitted attempt', async () => {
    const result = await service.submit({
      authenticatedUserId: 'user-id',
      documentType: IdentityDocumentType.PASSPORT,
      documentFront: file('document'),
      selfieWithDocument: file('selfie'),
    });

    expect(result).toMatchObject({
      id: 'submission-id',
      status: IdentityVerificationStatus.SUBMITTED,
    });
    expect(process).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][0].key).toContain(
      'identity-verification/user-id/',
    );
    expect(upload.mock.calls[0][0]).not.toHaveProperty('url');

    expect(createSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationId: 'verification-id',
          documentType: IdentityDocumentType.PASSPORT,
          status: IdentityVerificationStatus.SUBMITTED,
          evidence: {
            create: expect.arrayContaining([
              expect.objectContaining({
                type: IdentityEvidenceType.DOCUMENT_FRONT,
                objectKey: expect.any(String),
                sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
              }),
              expect.objectContaining({
                type: IdentityEvidenceType.SELFIE_WITH_DOCUMENT,
              }),
            ]),
          },
        }),
      }),
    );

    expect(updateVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentStatus: IdentityVerificationStatus.SUBMITTED,
          documentReviewedAt: null,
        }),
      }),
    );
  });

  it('rejects incomplete evidence before accessing storage or the database', async () => {
    await expect(
      service.submit({
        authenticatedUserId: 'user-id',
        documentType: IdentityDocumentType.PASSPORT,
        documentFront: file('document'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findVerification).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it.each([
    IdentityVerificationStatus.SUBMITTED,
    IdentityVerificationStatus.UNDER_REVIEW,
    IdentityVerificationStatus.APPROVED,
  ])('rejects a new attempt while the latest state is %s', async (status) => {
    findVerification.mockResolvedValue({
      id: 'verification-id',
      user: {
        status: 'ACTIVE',
        profile: {
          dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        },
      },
      identitySubmissions: [{ status }],
    });

    await expect(
      service.submit({
        authenticatedUserId: 'user-id',
        documentType: IdentityDocumentType.PASSPORT,
        documentFront: file('document'),
        selfieWithDocument: file('selfie'),
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(upload).not.toHaveBeenCalled();
  });

  it('allows a new version after a rejected attempt', async () => {
    findVerification.mockResolvedValue({
      id: 'verification-id',
      user: {
        status: 'ACTIVE',
        profile: {
          dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        },
      },
      identitySubmissions: [
        { status: IdentityVerificationStatus.REJECTED },
      ],
    });

    await expect(
      service.submit({
        authenticatedUserId: 'user-id',
        documentType: IdentityDocumentType.DRIVING_LICENCE,
        documentFront: file('document'),
        documentBack: file('back'),
        selfieWithDocument: file('selfie'),
      }),
    ).resolves.toMatchObject({
      status: IdentityVerificationStatus.SUBMITTED,
    });

    expect(upload).toHaveBeenCalledTimes(3);
  });

  it('rejects users who do not satisfy the 18+ eligibility policy', async () => {
    findVerification.mockResolvedValue({
      id: 'verification-id',
      user: {
        status: 'ACTIVE',
        profile: {
          dateOfBirth: new Date('2015-01-01T00:00:00.000Z'),
        },
      },
      identitySubmissions: [],
    });

    await expect(
      service.submit({
        authenticatedUserId: 'user-id',
        documentType: IdentityDocumentType.PASSPORT,
        documentFront: file('document'),
        selfieWithDocument: file('selfie'),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(upload).not.toHaveBeenCalled();
  });

  it('rolls back stored objects when a concurrent submission wins the transaction race', async () => {
    transactionFindVerification.mockResolvedValue({
      id: 'verification-id',
      identitySubmissions: [
        { status: IdentityVerificationStatus.UNDER_REVIEW },
      ],
    });

    await expect(
      service.submit({
        authenticatedUserId: 'user-id',
        documentType: IdentityDocumentType.PASSPORT,
        documentFront: file('document'),
        selfieWithDocument: file('selfie'),
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(upload).toHaveBeenCalledTimes(2);
    expect(deleteObject).toHaveBeenCalledTimes(2);
    expect(createSubmission).not.toHaveBeenCalled();
  });
});
