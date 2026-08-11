import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingStatus, ReportStatus } from '../generated/prisma/enums';

const reportAdminSelect = {
  id: true,
  reason: true,
  description: true,
  status: true,
  adminNotes: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  reporter: {
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
    },
  },
  reportedUser: {
    select: {
      id: true,
      status: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
    },
  },
  listing: {
    select: {
      id: true,
      title: true,
      status: true,
      userId: true,
      pausedReason: true,
    },
  },
  conversation: {
    select: {
      id: true,
      listingId: true,
      participantAId: true,
      participantBId: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

@Injectable()
export class ReportAdminService {
  constructor(private readonly database: DatabaseService) {}

  listQueue() {
    return this.database.report.findMany({
      where: {
        status: {
          in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW],
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: reportAdminSelect,
    });
  }

  async getDetail(reportId: string) {
    const report = await this.database.report.findUnique({
      where: { id: reportId },
      select: reportAdminSelect,
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return report;
  }

  markUnderReview(adminId: string, reportId: string, notes: string) {
    return this.transition(
      adminId,
      reportId,
      ReportStatus.UNDER_REVIEW,
      notes,
      'REPORT_MARKED_UNDER_REVIEW',
    );
  }

  resolve(adminId: string, reportId: string, notes: string) {
    return this.transition(
      adminId,
      reportId,
      ReportStatus.RESOLVED,
      notes,
      'REPORT_RESOLVED',
    );
  }

  dismiss(adminId: string, reportId: string, notes: string) {
    return this.transition(
      adminId,
      reportId,
      ReportStatus.DISMISSED,
      notes,
      'REPORT_DISMISSED',
    );
  }

  pauseListing(adminId: string, reportId: string, notes: string) {
    const normalizedNotes = this.normalizeNotes(notes);

    return this.database.$transaction(
      async (transaction) => {
        const report = await transaction.report.findUnique({
          where: { id: reportId },
          select: {
            id: true,
            status: true,
            listingId: true,
          },
        });

        if (!report) {
          throw new NotFoundException('Report not found.');
        }

        if (
          report.status !== ReportStatus.OPEN &&
          report.status !== ReportStatus.UNDER_REVIEW
        ) {
          throw new BadRequestException(
            'Only an open report can receive a preventive action.',
          );
        }

        if (!report.listingId) {
          throw new BadRequestException(
            'This report is not directly associated with a listing.',
          );
        }

        const listing = await transaction.listing.findFirst({
          where: {
            id: report.listingId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            pausedReason: true,
          },
        });

        if (!listing) {
          throw new NotFoundException('Listing not found.');
        }

        if (listing.status !== ListingStatus.ACTIVE) {
          throw new BadRequestException(
            'Only an active listing can be preventively paused.',
          );
        }

        const pausedReason = this.preventivePauseReason(reportId);

        await transaction.listing.update({
          where: { id: listing.id },
          data: {
            status: ListingStatus.PAUSED,
            pausedReason,
          },
          select: { id: true },
        });

        const updatedReport = await transaction.report.update({
          where: { id: reportId },
          data: {
            status: ReportStatus.UNDER_REVIEW,
            adminNotes: normalizedNotes,
          },
          select: reportAdminSelect,
        });

        await transaction.adminActionLog.create({
          data: {
            adminId,
            action: 'REPORT_LISTING_PREVENTIVELY_PAUSED',
            targetType: 'REPORT',
            targetId: reportId,
            reason: normalizedNotes,
            metadata: {
              listingId: listing.id,
              previousListingStatus: listing.status,
              pausedReason,
            },
          },
        });

        return updatedReport;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  restoreListing(adminId: string, reportId: string, notes: string) {
    const normalizedNotes = this.normalizeNotes(notes);

    return this.database.$transaction(
      async (transaction) => {
        const report = await transaction.report.findUnique({
          where: { id: reportId },
          select: {
            id: true,
            listingId: true,
          },
        });

        if (!report) {
          throw new NotFoundException('Report not found.');
        }

        if (!report.listingId) {
          throw new BadRequestException(
            'This report is not directly associated with a listing.',
          );
        }

        const listing = await transaction.listing.findFirst({
          where: {
            id: report.listingId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            pausedReason: true,
          },
        });

        if (!listing) {
          throw new NotFoundException('Listing not found.');
        }

        const expectedReason = this.preventivePauseReason(reportId);
        if (
          listing.status !== ListingStatus.PAUSED ||
          listing.pausedReason !== expectedReason
        ) {
          throw new BadRequestException(
            'This listing is not paused by this safety report.',
          );
        }

        await transaction.listing.update({
          where: { id: listing.id },
          data: {
            status: ListingStatus.ACTIVE,
            pausedReason: null,
          },
          select: { id: true },
        });

        await transaction.adminActionLog.create({
          data: {
            adminId,
            action: 'REPORT_LISTING_PREVENTIVE_PAUSE_RESTORED',
            targetType: 'REPORT',
            targetId: reportId,
            reason: normalizedNotes,
            metadata: {
              listingId: listing.id,
              restoredToStatus: ListingStatus.ACTIVE,
            },
          },
        });

        return transaction.report.findUnique({
          where: { id: reportId },
          select: reportAdminSelect,
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private transition(
    adminId: string,
    reportId: string,
    nextStatus: ReportStatus,
    notes: string,
    action: string,
  ) {
    const normalizedNotes = this.normalizeNotes(notes);

    return this.database.$transaction(
      async (transaction) => {
        const current = await transaction.report.findUnique({
          where: { id: reportId },
          select: {
            id: true,
            status: true,
          },
        });

        if (!current) {
          throw new NotFoundException('Report not found.');
        }

        this.assertTransition(current.status, nextStatus);
        const now = new Date();

        const report = await transaction.report.update({
          where: { id: reportId },
          data: {
            status: nextStatus,
            adminNotes: normalizedNotes,
            resolvedAt:
              nextStatus === ReportStatus.RESOLVED ||
              nextStatus === ReportStatus.DISMISSED
                ? now
                : null,
          },
          select: reportAdminSelect,
        });

        await transaction.adminActionLog.create({
          data: {
            adminId,
            action,
            targetType: 'REPORT',
            targetId: reportId,
            reason: normalizedNotes,
            metadata: {
              previousStatus: current.status,
              nextStatus,
            },
          },
        });

        return report;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private assertTransition(
    currentStatus: ReportStatus,
    nextStatus: ReportStatus,
  ): void {
    if (
      currentStatus === ReportStatus.RESOLVED ||
      currentStatus === ReportStatus.DISMISSED
    ) {
      throw new BadRequestException(
        'This report already has a final decision.',
      );
    }

    if (
      nextStatus === ReportStatus.UNDER_REVIEW &&
      currentStatus !== ReportStatus.OPEN
    ) {
      throw new BadRequestException('Only an open report can enter review.');
    }

    if (
      nextStatus !== ReportStatus.UNDER_REVIEW &&
      nextStatus !== ReportStatus.RESOLVED &&
      nextStatus !== ReportStatus.DISMISSED
    ) {
      throw new BadRequestException('Unsupported report transition.');
    }
  }

  private normalizeNotes(notes: string): string {
    const normalized = notes.trim();

    if (!normalized) {
      throw new BadRequestException('Admin notes are required.');
    }

    if (normalized.length > 2000) {
      throw new BadRequestException(
        'Admin notes cannot exceed 2000 characters.',
      );
    }

    return normalized;
  }

  private preventivePauseReason(reportId: string): string {
    return `Preventive safety pause for report ${reportId}`;
  }
}
