import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingAuthorizationStatus } from '../generated/prisma/enums';
import { ListingAuthorizationReviewService } from './listing-authorization-review.service';

describe('ListingAuthorizationReviewService', () => {
  const findSubmission = jest.fn();
  const findEvidence = jest.fn();
  const createAdminLog = jest.fn();
  const transactionFindSubmission = jest.fn();
  const updateSubmission = jest.fn();

  const transaction = {
    listingAuthorizationSubmission: {
      findFirst: transactionFindSubmission,
      update: updateSubmission,
    },
    adminActionLog: {
      create: createAdminLog,
    },
  };

  const $transaction = jest.fn(
    async (
      callback: (client: typeof transaction) => Promise<unknown>,
    ): Promise<unknown> => callback(transaction),
  );

  const read = jest.fn(() => Promise.resolve(Buffer.from('private-document')));

  const service = new ListingAuthorizationReviewService(
    {
      listingAuthorizationSubmission: {
        findFirst: findSubmission,
      },
      listingAuthorizationEvidence: {
        findFirst: findEvidence,
      },
      adminActionLog: {
        create: createAdminLog,
      },
      $transaction,
    } as never,
    { read } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    transactionFindSubmission.mockResolvedValue({
      id: 'submission-id',
      status: ListingAuthorizationStatus.SUBMITTED,
      listing: {
        landlordApprovalRequired: false,
        authorizationSubmissions: [{ id: 'submission-id' }],
      },
    });
    updateSubmission.mockResolvedValue({
      id: 'submission-id',
      listingId: 'listing-id',
      status: ListingAuthorizationStatus.APPROVED,
      relationshipVerified: true,
      landlordAuthorizationVerified: false,
    });
  });

  it('returns safe review metadata without private object keys', async () => {
    findSubmission.mockResolvedValue({
      id: 'submission-id',
      status: ListingAuthorizationStatus.SUBMITTED,
      evidence: [
        {
          id: 'evidence-id',
          type: 'TENANCY_AGREEMENT',
          mimeType: 'application/pdf',
          sizeBytes: 123,
          originalFileName: 'lease.pdf',
        },
      ],
    });

    const result = await service.getLatestForAdmin('listing-id');

    expect(JSON.stringify(result)).not.toContain('objectKey');
    expect(JSON.stringify(result)).not.toContain('sha256');
  });

  it('reads private evidence and audits the access without logging the object key', async () => {
    findEvidence.mockResolvedValue({
      id: 'evidence-id',
      type: 'TENANCY_AGREEMENT',
      objectKey: 'listing-authorization/private/lease.pdf',
      mimeType: 'application/pdf',
    });

    await expect(
      service.readEvidence(
        'admin-id',
        'listing-id',
        'submission-id',
        'evidence-id',
      ),
    ).resolves.toEqual({
      buffer: Buffer.from('private-document'),
      mimeType: 'application/pdf',
    });

    expect(createAdminLog).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-id',
        action: 'LISTING_AUTHORIZATION_EVIDENCE_VIEWED',
        targetType: 'LISTING_AUTHORIZATION_EVIDENCE',
        targetId: 'evidence-id',
        metadata: {
          listingId: 'listing-id',
          submissionId: 'submission-id',
          evidenceType: 'TENANCY_AGREEMENT',
        },
      },
    });
    expect(JSON.stringify(createAdminLog.mock.calls[0][0])).not.toContain(
      'lease.pdf',
    );
  });

  it('fails closed when evidence does not belong to the submission', async () => {
    findEvidence.mockResolvedValue(null);

    await expect(
      service.readEvidence(
        'admin-id',
        'listing-id',
        'submission-id',
        'other-evidence',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(read).not.toHaveBeenCalled();
  });

  it('approves the latest reviewable relationship evidence and audits the outcome', async () => {
    await service.approve('admin-id', 'listing-id', 'submission-id', {
      relationshipVerified: true,
      landlordAuthorizationVerified: false,
    });

    expect(updateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ListingAuthorizationStatus.APPROVED,
          relationshipVerified: true,
          landlordAuthorizationVerified: false,
        }),
      }),
    );
    expect(createAdminLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LISTING_AUTHORIZATION_APPROVED',
        }),
      }),
    );
  });

  it('requires landlord authorization when the listing declares it required', async () => {
    transactionFindSubmission.mockResolvedValue({
      id: 'submission-id',
      status: ListingAuthorizationStatus.SUBMITTED,
      listing: {
        landlordApprovalRequired: true,
        authorizationSubmissions: [{ id: 'submission-id' }],
      },
    });

    await expect(
      service.approve('admin-id', 'listing-id', 'submission-id', {
        relationshipVerified: true,
        landlordAuthorizationVerified: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to approve a relationship that was not verified', () => {
    expect(() =>
      service.approve('admin-id', 'listing-id', 'submission-id', {
        relationshipVerified: false,
        landlordAuthorizationVerified: false,
      }),
    ).toThrow(BadRequestException);
  });

  it('blocks a stale authorization attempt', async () => {
    transactionFindSubmission.mockResolvedValue({
      id: 'submission-id',
      status: ListingAuthorizationStatus.SUBMITTED,
      listing: {
        landlordApprovalRequired: false,
        authorizationSubmissions: [{ id: 'newer-submission' }],
      },
    });

    await expect(
      service.requestCorrection(
        'admin-id',
        'listing-id',
        'submission-id',
        'Upload a clearer document.',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records correction and rejection as distinct decisions', async () => {
    updateSubmission.mockResolvedValue({
      id: 'submission-id',
      status: ListingAuthorizationStatus.CORRECTION_REQUIRED,
    });

    await service.requestCorrection(
      'admin-id',
      'listing-id',
      'submission-id',
      '  Upload a clearer document. ',
    );

    expect(createAdminLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LISTING_AUTHORIZATION_CORRECTION_REQUESTED',
          reason: 'Upload a clearer document.',
        }),
      }),
    );
  });
});
