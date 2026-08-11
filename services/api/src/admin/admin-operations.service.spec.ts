jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import {
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingStatus,
  ReportStatus,
} from '../generated/prisma/enums';
import { AdminOperationsService } from './admin-operations.service';

describe('AdminOperationsService', () => {
  const identityCount = jest.fn();
  const identityFindMany = jest.fn();
  const authorizationCount = jest.fn();
  const authorizationFindMany = jest.fn();
  const listingCount = jest.fn();
  const listingFindMany = jest.fn();
  const reportCount = jest.fn();
  const reportFindMany = jest.fn();

  const database = {
    identityVerificationSubmission: {
      count: identityCount,
      findMany: identityFindMany,
    },
    listingAuthorizationSubmission: {
      count: authorizationCount,
      findMany: authorizationFindMany,
    },
    listing: {
      count: listingCount,
      findMany: listingFindMany,
    },
    report: {
      count: reportCount,
      findMany: reportFindMany,
    },
  };

  const service = new AdminOperationsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    identityCount.mockResolvedValue(2);
    authorizationCount.mockResolvedValue(3);
    listingCount.mockResolvedValue(4);
    reportCount.mockResolvedValue(5);
    identityFindMany.mockResolvedValue([]);
    authorizationFindMany.mockResolvedValue([]);
    listingFindMany.mockResolvedValue([]);
    reportFindMany.mockResolvedValue([]);
  });

  it('aggregates pending operational work without duplicating decision logic', async () => {
    const result = await service.getSummary();

    expect(result.totals).toEqual({
      identityReviews: 2,
      listingAuthorizationReviews: 3,
      listingModerationReviews: 4,
      safetyReports: 5,
      pendingWork: 14,
    });

    expect(identityCount).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: {
          in: [
            IdentityVerificationStatus.SUBMITTED,
            IdentityVerificationStatus.UNDER_REVIEW,
          ],
        },
      },
    });
    expect(authorizationCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        status: {
          in: [
            ListingAuthorizationStatus.SUBMITTED,
            ListingAuthorizationStatus.UNDER_REVIEW,
          ],
        },
      }),
    });
    expect(listingCount).toHaveBeenCalledWith({
      where: {
        status: ListingStatus.PENDING_REVIEW,
        deletedAt: null,
      },
    });
    expect(reportCount).toHaveBeenCalledWith({
      where: {
        status: {
          in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW],
        },
      },
    });
  });

  it('uses bounded deterministic previews with minimum safe projections', async () => {
    await service.getSummary();

    expect(identityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(authorizationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(listingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(reportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );

    const serializedCalls = JSON.stringify({
      identity: identityFindMany.mock.calls,
      authorization: authorizationFindMany.mock.calls,
      listings: listingFindMany.mock.calls,
      reports: reportFindMany.mock.calls,
    });

    expect(serializedCalls).not.toContain('objectKey');
    expect(serializedCalls).not.toContain('evidence');
    expect(serializedCalls).not.toContain('privateLocation');
    expect(serializedCalls).not.toContain('description');
    expect(serializedCalls).not.toContain('adminNotes');
    expect(serializedCalls).not.toContain('email');
  });
});
