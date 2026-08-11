import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingStatus, ReportStatus } from '../generated/prisma/enums';
import { ReportAdminService } from './report-admin.service';

const now = new Date('2026-08-11T03:20:00.000Z');

const adminReportRow = {
  id: 'report-id',
  reason: 'SCAM',
  description: 'Suspicious request',
  status: ReportStatus.UNDER_REVIEW,
  adminNotes: 'Checking evidence',
  resolvedAt: null,
  createdAt: now,
  updatedAt: now,
  reporter: null,
  reportedUser: null,
  listing: null,
  conversation: null,
};

describe('ReportAdminService', () => {
  const reportFindMany = jest.fn();
  const reportFindUnique = jest.fn();
  const reportUpdate = jest.fn();
  const listingFindFirst = jest.fn();
  const listingUpdate = jest.fn();
  const adminActionCreate = jest.fn();
  const transaction = jest.fn();

  const database = {
    report: {
      findMany: reportFindMany,
      findUnique: reportFindUnique,
      update: reportUpdate,
    },
    listing: {
      findFirst: listingFindFirst,
      update: listingUpdate,
    },
    adminActionLog: { create: adminActionCreate },
    $transaction: transaction,
  };

  const service = new ReportAdminService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    reportFindMany.mockResolvedValue([]);
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      status: ReportStatus.OPEN,
      listingId: 'listing-id',
    });
    reportUpdate.mockResolvedValue(adminReportRow);
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      status: ListingStatus.ACTIVE,
      pausedReason: null,
    });
    listingUpdate.mockResolvedValue({ id: 'listing-id' });
    adminActionCreate.mockResolvedValue({ id: 'log-id' });
    transaction.mockImplementation((callback) => callback(database));
  });

  it('queues only open and under-review reports', async () => {
    await service.listQueue();

    expect(reportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW],
          },
        },
      }),
    );
  });

  it('returns not found for missing admin detail', async () => {
    reportFindUnique.mockResolvedValue(null);

    await expect(service.getDetail('missing-report')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marks an open report under review and audits the transition', async () => {
    await service.markUnderReview('admin-id', 'report-id', '  Reviewing  ');

    expect(reportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ReportStatus.UNDER_REVIEW,
          adminNotes: 'Reviewing',
          resolvedAt: null,
        }),
      }),
    );
    expect(adminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin-id',
          action: 'REPORT_MARKED_UNDER_REVIEW',
          targetType: 'REPORT',
          targetId: 'report-id',
          reason: 'Reviewing',
        }),
      }),
    );
  });

  it('resolves an under-review report with a final timestamp and audit', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      status: ReportStatus.UNDER_REVIEW,
    });

    await service.resolve('admin-id', 'report-id', 'Confirmed and handled');

    const updateArgument = reportUpdate.mock.calls[0]?.[0] as {
      data: { status: ReportStatus; resolvedAt: Date | null };
    };
    expect(updateArgument.data.status).toBe(ReportStatus.RESOLVED);
    expect(updateArgument.data.resolvedAt).toBeInstanceOf(Date);
  });

  it('rejects transitions after a final report decision', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      status: ReportStatus.RESOLVED,
    });

    await expect(
      service.dismiss('admin-id', 'report-id', 'No further action'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reportUpdate).not.toHaveBeenCalled();
  });

  it('requires normalized non-empty admin notes', async () => {
    await expect(
      service.markUnderReview('admin-id', 'report-id', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('preventively pauses only an active listing tied directly to the report', async () => {
    await service.pauseListing('admin-id', 'report-id', 'Potential scam risk');

    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: 'listing-id' },
      data: {
        status: ListingStatus.PAUSED,
        pausedReason: 'Preventive safety pause for report report-id',
      },
      select: { id: true },
    });
    expect(reportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: ReportStatus.UNDER_REVIEW,
          adminNotes: 'Potential scam risk',
        },
      }),
    );
    expect(adminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REPORT_LISTING_PREVENTIVELY_PAUSED',
        }),
      }),
    );
  });

  it('does not pause a listing for a user-only or conversation-only report', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      status: ReportStatus.OPEN,
      listingId: null,
    });

    await expect(
      service.pauseListing('admin-id', 'report-id', 'Risk'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listingUpdate).not.toHaveBeenCalled();
  });

  it('does not override a listing that is already non-active', async () => {
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      status: ListingStatus.PAUSED,
      pausedReason: 'Another moderation reason',
    });

    await expect(
      service.pauseListing('admin-id', 'report-id', 'Risk'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listingUpdate).not.toHaveBeenCalled();
  });

  it('restores only the exact preventive pause created by this report', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      listingId: 'listing-id',
    });
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      status: ListingStatus.PAUSED,
      pausedReason: 'Preventive safety pause for report report-id',
    });

    await service.restoreListing('admin-id', 'report-id', 'Cleared after review');

    expect(listingUpdate).toHaveBeenCalledWith({
      where: { id: 'listing-id' },
      data: {
        status: ListingStatus.ACTIVE,
        pausedReason: null,
      },
      select: { id: true },
    });
    expect(adminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REPORT_LISTING_PREVENTIVE_PAUSE_RESTORED',
        }),
      }),
    );
  });

  it('refuses to restore a pause created for another reason or report', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      listingId: 'listing-id',
    });
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      status: ListingStatus.PAUSED,
      pausedReason: 'Preventive safety pause for report another-report',
    });

    await expect(
      service.restoreListing('admin-id', 'report-id', 'Clear'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listingUpdate).not.toHaveBeenCalled();
  });
});
