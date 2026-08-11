import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ProductEventType, VisitStatus } from '../generated/prisma/enums';

const REVIEW_SAMPLE_LIMIT = 500;
const SCHEDULED_VISIT_STATUSES: VisitStatus[] = [
  VisitStatus.ACCEPTED,
  VisitStatus.CANCELLED,
  VisitStatus.COMPLETED,
  VisitStatus.NO_SHOW,
];

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly database: DatabaseService) {}

  async getSummary(now = new Date()) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      allTime,
      last30Days,
      last7Days,
      identityReviews,
      authorizationReviews,
    ] = await Promise.all([
      this.countSignals(),
      this.countSignals(thirtyDaysAgo),
      this.countSignals(sevenDaysAgo),
      this.database.identityVerificationSubmission.findMany({
        where: {
          submittedAt: { gte: thirtyDaysAgo },
          reviewedAt: { not: null },
          deletedAt: null,
        },
        orderBy: { reviewedAt: 'desc' },
        take: REVIEW_SAMPLE_LIMIT,
        select: {
          submittedAt: true,
          reviewedAt: true,
        },
      }),
      this.database.listingAuthorizationSubmission.findMany({
        where: {
          submittedAt: { gte: thirtyDaysAgo },
          reviewedAt: { not: null },
          deletedAt: null,
        },
        orderBy: { reviewedAt: 'desc' },
        take: REVIEW_SAMPLE_LIMIT,
        select: {
          submittedAt: true,
          reviewedAt: true,
        },
      }),
    ]);

    return {
      generatedAt: now,
      signals: {
        allTime,
        last30Days,
        last7Days,
      },
      reviewTurnaroundMinutes: {
        identity: this.averageTurnaroundMinutes(identityReviews),
        listingAuthorization:
          this.averageTurnaroundMinutes(authorizationReviews),
      },
      reviewSampleLimit: REVIEW_SAMPLE_LIMIT,
    };
  }

  private async countSignals(since?: Date) {
    const occurredAt = since ? { gte: since } : undefined;

    const [
      searches,
      listingsPublished,
      conversationsStarted,
      visitsScheduled,
      visitsCompleted,
      visitsNoShow,
      listingsClosed,
    ] = await Promise.all([
      this.database.productEvent.count({
        where: {
          type: ProductEventType.SEARCH_PERFORMED,
          occurredAt,
        },
      }),
      this.database.adminActionLog.count({
        where: {
          action: 'LISTING_APPROVED',
          createdAt: occurredAt,
        },
      }),
      this.database.conversation.count({
        where: {
          createdAt: occurredAt,
        },
      }),
      this.database.visit.count({
        where: {
          status: { in: SCHEDULED_VISIT_STATUSES },
          respondedAt: occurredAt ? { ...occurredAt, not: null } : { not: null },
        },
      }),
      this.database.visit.count({
        where: {
          status: VisitStatus.COMPLETED,
          outcomeAt: occurredAt ? { ...occurredAt, not: null } : { not: null },
        },
      }),
      this.database.visit.count({
        where: {
          status: VisitStatus.NO_SHOW,
          outcomeAt: occurredAt ? { ...occurredAt, not: null } : { not: null },
        },
      }),
      this.database.listing.count({
        where: {
          closedAt: occurredAt ? { ...occurredAt, not: null } : { not: null },
        },
      }),
    ]);

    return {
      searches,
      listingsPublished,
      conversationsStarted,
      visitsScheduled,
      visitsCompleted,
      visitsNoShow,
      listingsClosed,
    };
  }

  private averageTurnaroundMinutes(
    rows: Array<{ submittedAt: Date; reviewedAt: Date | null }>,
  ): number | null {
    const durations = rows.flatMap((row) =>
      row.reviewedAt
        ? [Math.max(0, row.reviewedAt.getTime() - row.submittedAt.getTime())]
        : [],
    );

    if (durations.length === 0) {
      return null;
    }

    const averageMs =
      durations.reduce((total, duration) => total + duration, 0) /
      durations.length;

    return Math.round(averageMs / 60_000);
  }
}
