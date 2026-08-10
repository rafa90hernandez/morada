import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  ListingAuthorizationEvidenceType,
  ListingAuthorizationStatus,
  ListingType,
} from '../generated/prisma/enums';
import { ListingAuthorizationSubmissionService } from './listing-authorization-submission.service';

const file = {
  buffer: Buffer.from('%PDF-1.7\nexample\n%%EOF'),
  mimeType: 'application/pdf',
  sizeBytes: Buffer.byteLength('%PDF-1.7\nexample\n%%EOF'),
  originalFileName: 'contract.pdf',
};

const evidence = [
  {
    type: ListingAuthorizationEvidenceType.TENANCY_AGREEMENT,
    file,
  },
];

describe('ListingAuthorizationSubmissionService', () => {
  const listingFindFirst = jest.fn();
  const submissionFindFirst = jest.fn();
  const submissionCreate = jest.fn();
  const transaction = {
    listing: {
      findFirst: listingFindFirst,
    },
    listingAuthorizationSubmission: {
      findFirst: submissionFindFirst,
      create: submissionCreate,
    },
  };
  const database = {
    listing: {
      findFirst: listingFindFirst,
    },
    listingAuthorizationSubmission: {
      findFirst: submissionFindFirst,
    },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const evidenceProcessor = {
    process: jest.fn(),
  };
  const privateStorage = {
    upload: jest.fn(),
    read: jest.fn(),
    delete: jest.fn(),
  };
  const service = new ListingAuthorizationSubmissionService(
    database as never,
    evidenceProcessor as never,
    privateStorage,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an incomplete submission before touching storage', async () => {
    await expect(
      service.submit({
        authenticatedUserId: 'owner-id',
        listingId: 'listing-id',
        evidence: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(listingFindFirst).not.toHaveBeenCalled();
    expect(privateStorage.upload).not.toHaveBeenCalled();
  });

  it('uses owner-scoped listing lookup and does not reveal another users listing', async () => {
    listingFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.submit({
        authenticatedUserId: 'wrong-owner',
        listingId: 'listing-id',
        evidence,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(listingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'listing-id',
          userId: 'wrong-owner',
          deletedAt: null,
        },
      }),
    );
    expect(privateStorage.upload).not.toHaveBeenCalled();
  });

  it('does not accept right-to-advertise evidence for wanted listings', async () => {
    listingFindFirst.mockResolvedValueOnce({
      id: 'listing-id',
      type: ListingType.WANTED,
      user: { status: 'ACTIVE' },
    });

    await expect(
      service.submit({
        authenticatedUserId: 'owner-id',
        listingId: 'listing-id',
        evidence,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(privateStorage.upload).not.toHaveBeenCalled();
  });

  it('blocks silent overwrite while an attempt is awaiting review', async () => {
    listingFindFirst.mockResolvedValueOnce({
      id: 'listing-id',
      type: ListingType.RENTAL,
      user: { status: 'ACTIVE' },
    });
    submissionFindFirst.mockResolvedValueOnce({
      status: ListingAuthorizationStatus.SUBMITTED,
    });

    await expect(
      service.submit({
        authenticatedUserId: 'owner-id',
        listingId: 'listing-id',
        evidence,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(privateStorage.upload).not.toHaveBeenCalled();
  });

  it('stores private evidence with a server-generated key and returns safe metadata only', async () => {
    listingFindFirst
      .mockResolvedValueOnce({
        id: 'listing-id',
        type: ListingType.RENTAL,
        user: { status: 'ACTIVE' },
      })
      .mockResolvedValueOnce({
        id: 'listing-id',
        type: ListingType.RENTAL,
        user: { status: 'ACTIVE' },
      });
    submissionFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    evidenceProcessor.process.mockResolvedValueOnce({
      buffer: file.buffer,
      mimeType: 'application/pdf',
      sizeBytes: file.sizeBytes,
      extension: 'pdf',
    });
    privateStorage.upload.mockImplementation(({ key }) => ({ key }));
    submissionCreate.mockResolvedValueOnce({
      id: 'submission-id',
      listingId: 'listing-id',
      status: ListingAuthorizationStatus.SUBMITTED,
      submittedAt: new Date('2026-08-09T22:00:00.000Z'),
      evidence: [
        {
          id: 'evidence-id',
          type: ListingAuthorizationEvidenceType.TENANCY_AGREEMENT,
          mimeType: 'application/pdf',
          sizeBytes: file.sizeBytes,
          originalFileName: 'contract.pdf',
        },
      ],
    });

    const result = await service.submit({
      authenticatedUserId: 'owner-id',
      listingId: 'listing-id',
      evidence,
    });

    expect(privateStorage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^listing-authorization\/owner-id\/listing-id\/.+\/tenancy_agreement-.+\.pdf$/,
        ),
        contentType: 'application/pdf',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('objectKey');
    expect(JSON.stringify(result)).not.toContain('sha256');
    expect(JSON.stringify(result)).not.toContain('url');
  });

  it('deletes already stored private objects when persistence fails', async () => {
    listingFindFirst
      .mockResolvedValueOnce({
        id: 'listing-id',
        type: ListingType.RENTAL,
        user: { status: 'ACTIVE' },
      })
      .mockResolvedValueOnce({
        id: 'listing-id',
        type: ListingType.RENTAL,
        user: { status: 'ACTIVE' },
      });
    submissionFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    evidenceProcessor.process.mockResolvedValueOnce({
      buffer: file.buffer,
      mimeType: 'application/pdf',
      sizeBytes: file.sizeBytes,
      extension: 'pdf',
    });
    privateStorage.upload.mockResolvedValueOnce({ key: 'private/object.pdf' });
    submissionCreate.mockRejectedValueOnce(new Error('database failed'));

    await expect(
      service.submit({
        authenticatedUserId: 'owner-id',
        listingId: 'listing-id',
        evidence,
      }),
    ).rejects.toThrow('database failed');

    expect(privateStorage.delete).toHaveBeenCalledWith('private/object.pdf');
  });
});
