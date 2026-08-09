import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { IdentityVerificationStatus } from '../generated/prisma/enums';
import { AdminIdentityVerificationService } from './admin-identity-verification.service';

describe('AdminIdentityVerificationService', () => {
  const findManySubmissions = jest.fn();
  const findSubmission = jest.fn();
  const findEvidence = jest.fn();
  const updateSubmission = jest.fn();
  const updateVerification = jest.fn();
  const createAdminLog = jest.fn();
  const transactionFindSubmission = jest.fn();

  const transaction = {
    identityVerificationSubmission: {
      findFirst: transactionFindSubmission,
      update: updateSubmission,
    },
    verification: {
      update: updateVerification,
    },
    adminActionLog: {
      create: createAdminLog,
    },
  };

  const $transaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );

  const database = {
    identityVerificationSubmission: {
      findMany: findManySubmissions,
      findFirst: findSubmission,
    },
    identityVerificationEvidence: {
      findFirst: findEvidence,
    },
    adminActionLog: {
      create: createAdminLog,
    },
    $transaction,
  };

  const read = jest.fn(() => Promise.resolve(Buffer.from('private-image')));

  const service = new AdminIdentityVerificationService(
    database as never,
    {
      read,
    } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    transactionFindSubmission.mockResolvedValue({
      id: 'submission-id',
      status: IdentityVerificationStatus.SUBMITTED,
      verificationId: 'verification-id',
      verification: {
        identitySubmissions: [{ id: 'submission-id' }],
      },
    });

    updateSubmission.mockResolvedValue({
      id: 'submission-id',
      documentType: 'PASSPORT',
      status: IdentityVerificationStatus.APPROVED,
      submittedAt: new Date('2026-08-09T19:00:00.000Z'),
      reviewedAt: new Date('2026-08-09T20:00:00.000Z'),
      reviewReason: null,
      reviewedBy: 'admin-id',
    });
  });

  it('queries only submitted or in-review attempts for the review queue', async () => {
    findManySubmissions.mockResolvedValue([]);

    await expect(service.listQueue()).resolves.toEqual([]);

    expect(findManySubmissions).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          status: {
            in: [
              IdentityVerificationStatus.SUBMITTED,
              IdentityVerificationStatus.UNDER_REVIEW,
            ],
          },
        },
      }),
    );
  });

  it('returns safe detail metadata without object keys or checksums', async () => {
    findSubmission.mockResolvedValue({
      id: 'submission-id',
      documentType: 'PASSPORT',
      status: IdentityVerificationStatus.SUBMITTED,
      evidence: [
        {
          id: 'evidence-id',
          type: 'DOCUMENT_FRONT',
          mimeType: 'image/jpeg',
          sizeBytes: 123,
          createdAt: new Date('2026-08-09T19:00:00.000Z'),
        },
      ],
    });

    const result = await service.getSubmission('submission-id');

    expect(result.evidence[0]).not.toHaveProperty('objectKey');
    expect(result.evidence[0]).not.toHaveProperty('sha256');
  });

  it('reads private evidence and audits the view without logging its object key', async () => {
    findEvidence.mockResolvedValue({
      id: 'evidence-id',
      type: 'DOCUMENT_FRONT',
      objectKey: 'identity-verification/user/submission/front.jpg',
      mimeType: 'image/jpeg',
    });

    await expect(
      service.readEvidence('admin-id', 'submission-id', 'evidence-id'),
    ).resolves.toEqual({
      buffer: Buffer.from('private-image'),
      mimeType: 'image/jpeg',
    });

    expect(read).toHaveBeenCalledWith(
      'identity-verification/user/submission/front.jpg',
    );
    expect(createAdminLog).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-id',
        action: 'IDENTITY_EVIDENCE_VIEWED',
        targetType: 'IDENTITY_VERIFICATION_EVIDENCE',
        targetId: 'evidence-id',
        metadata: {
          submissionId: 'submission-id',
          evidenceType: 'DOCUMENT_FRONT',
        },
      },
    });
    expect(JSON.stringify(createAdminLog.mock.calls[0][0])).not.toContain(
      'front.jpg',
    );
  });

  it('fails closed when evidence metadata does not belong to the submission', async () => {
    findEvidence.mockResolvedValue(null);

    await expect(
      service.readEvidence('admin-id', 'submission-id', 'other-evidence'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(read).not.toHaveBeenCalled();
    expect(createAdminLog).not.toHaveBeenCalled();
  });

  it('approves the latest reviewable attempt and records the admin decision', async () => {
    await expect(
      service.approve('admin-id', 'submission-id'),
    ).resolves.toMatchObject({
      status: IdentityVerificationStatus.APPROVED,
    });

    expect(updateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'submission-id' },
        data: expect.objectContaining({
          status: IdentityVerificationStatus.APPROVED,
          reviewedBy: 'admin-id',
          reviewReason: null,
        }),
      }),
    );
    expect(updateVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'verification-id' },
        data: expect.objectContaining({
          documentStatus: IdentityVerificationStatus.APPROVED,
          documentReviewedAt: expect.any(Date),
        }),
      }),
    );
    expect(createAdminLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin-id',
          action: 'IDENTITY_VERIFICATION_APPROVED',
          targetId: 'submission-id',
        }),
      }),
    );
  });

  it('normalizes a rejection reason and audits the same normalized value', async () => {
    updateSubmission.mockResolvedValue({
      id: 'submission-id',
      status: IdentityVerificationStatus.REJECTED,
      reviewReason: 'Document is unreadable',
    });

    await service.reject(
      'admin-id',
      'submission-id',
      '  Document is unreadable  ',
    );

    expect(updateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: IdentityVerificationStatus.REJECTED,
          reviewReason: 'Document is unreadable',
        }),
      }),
    );
    expect(createAdminLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'IDENTITY_VERIFICATION_REJECTED',
          reason: 'Document is unreadable',
        }),
      }),
    );
  });

  it('rejects blank rejection reasons before starting a transaction', () => {
    expect(() =>
      service.reject('admin-id', 'submission-id', '   '),
    ).toThrow(BadRequestException);

    expect($transaction).not.toHaveBeenCalled();
  });

  it.each([
    IdentityVerificationStatus.APPROVED,
    IdentityVerificationStatus.REJECTED,
    IdentityVerificationStatus.CANCELLED,
    IdentityVerificationStatus.CORRECTION_REQUIRED,
  ])('rejects a decision from terminal/non-review state %s', async (status) => {
    transactionFindSubmission.mockResolvedValue({
      id: 'submission-id',
      status,
      verificationId: 'verification-id',
      verification: {
        identitySubmissions: [{ id: 'submission-id' }],
      },
    });

    await expect(
      service.approve('admin-id', 'submission-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updateSubmission).not.toHaveBeenCalled();
  });

  it('refuses to decide a stale attempt even when its state is reviewable', async () => {
    transactionFindSubmission.mockResolvedValue({
      id: 'old-submission',
      status: IdentityVerificationStatus.SUBMITTED,
      verificationId: 'verification-id',
      verification: {
        identitySubmissions: [{ id: 'new-submission' }],
      },
    });

    await expect(
      service.approve('admin-id', 'old-submission'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updateSubmission).not.toHaveBeenCalled();
  });
});
