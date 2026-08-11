import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ProductEventType } from '../generated/prisma/enums';

const EVENT_TYPES: ProductEventType[] = [
  ProductEventType.SEARCH_PERFORMED,
  ProductEventType.LISTING_PUBLISHED,
  ProductEventType.CONVERSATION_STARTED,
  ProductEventType.VISIT_ACCEPTED,
  ProductEventType.VISIT_COMPLETED,
  ProductEventType.VISIT_NO_SHOW,
  ProductEventType.LISTING_CLOSED,
];

const REVIEW_SAMPLE_LIMIT = 500;

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly database: DatabaseService) {}

  async getSummary(now = new Date()) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [allTime, last30Days, last7Days, identityReviews, authorizationReviews] =
      await Promise.all([
        this.groupCounts(),
        this.groupCounts(thirtyDaysAgo),
        this.groupCounts(sevenDaysAgo),
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
      events: {
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

  private async groupCounts(since?: Date) {
    const rows = await this.database.productEvent.groupBy({
      by: ['type'],
      where: since ? { occurredAt: { gte: since } } : undefined,
      _count: { _all: true },
    });

    const counts = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as Record<
      ProductEventType,
      number
    >;

    for (const row of rows) {
      counts[row.type] = row._count._all;
    }

    return counts;
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
