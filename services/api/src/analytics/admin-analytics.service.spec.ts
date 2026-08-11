jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { VisitStatus } from '../generated/prisma/enums';
import { AdminAnalyticsService } from './admin-analytics.service';

describe('AdminAnalyticsService', () => {
  const productEventCount = jest.fn();
  const adminActionCount = jest.fn();
  const conversationCount = jest.fn();
  const visitCount = jest.fn();
  const listingCount = jest.fn();
  const identityFindMany = jest.fn();
  const authorizationFindMany = jest.fn();

  const database = {
    productEvent: { count: productEventCount },
    adminActionLog: { count: adminActionCount },
    conversation: { count: conversationCount },
    visit: { count: visitCount },
    listing: { count: listingCount },
    identityVerificationSubmission: { findMany: identityFindMany },
    listingAuthorizationSubmission: { findMany: authorizationFindMany },
  };

  const service = new AdminAnalyticsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    productEventCount.mockResolvedValue(10);
    adminActionCount.mockResolvedValue(8);
    conversationCount.mockResolvedValue(6);
    listingCount.mockResolvedValue(2);
    visitCount.mockImplementation(({ where }) => {
      if (where.status === VisitStatus.COMPLETED) return Promise.resolve(3);
      if (where.status === VisitStatus.NO_SHOW) return Promise.resolve(1);
      return Promise.resolve(4);
    });
    identityFindMany.mockResolvedValue([
      {
        submittedAt: new Date('2026-08-11T06:00:00.000Z'),
        reviewedAt: new Date('2026-08-11T06:30:00.000Z'),
      },
    ]);
    authorizationFindMany.mockResolvedValue([
      {
        submittedAt: new Date('2026-08-11T05:00:00.000Z'),
        reviewedAt: new Date('2026-08-11T06:00:00.000Z'),
      },
    ]);
  });

  it('returns aggregate funnel signals without exposing raw analytics rows', async () => {
    const result = await service.getSummary(
      new Date('2026-08-11T07:30:00.000Z'),
    );

    expect(result.signals.allTime).toEqual({
      searches: 10,
      listingsPublished: 8,
      conversationsStarted: 6,
      visitsScheduled: 4,
      visitsCompleted: 3,
      visitsNoShow: 1,
      listingsClosed: 2,
    });
    expect(result.reviewTurnaroundMinutes).toEqual({
      identity: 30,
      listingAuthorization: 60,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('objectKey');
    expect(serialized).not.toContain('messageBody');
    expect(serialized).not.toContain('reportDescription');
    expect(serialized).not.toContain('exactAddress');
    expect(serialized).not.toContain('email');
  });

  it('uses canonical operational tables instead of duplicating existing milestones', async () => {
    await service.getSummary(new Date('2026-08-11T07:30:00.000Z'));

    expect(adminActionCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'LISTING_APPROVED' }),
      }),
    );
    expect(conversationCount).toHaveBeenCalled();
    expect(listingCount).toHaveBeenCalled();
    expect(visitCount).toHaveBeenCalled();
  });
});
