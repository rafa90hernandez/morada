import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ReportReason, ReportStatus } from '../generated/prisma/enums';
import { ReportsService } from './reports.service';

const createdAt = new Date('2026-08-11T03:10:00.000Z');
const reportRow = {
  id: 'report-id',
  reason: ReportReason.SCAM,
  status: ReportStatus.OPEN,
  reportedUserId: 'reported-id',
  listingId: null,
  conversationId: null,
  createdAt,
};

describe('ReportsService', () => {
  const userFindFirst = jest.fn();
  const userFindUnique = jest.fn();
  const listingFindFirst = jest.fn();
  const conversationFindFirst = jest.fn();
  const reportFindFirst = jest.fn();
  const reportCreate = jest.fn();
  const transaction = jest.fn();

  const database = {
    user: {
      findFirst: userFindFirst,
      findUnique: userFindUnique,
    },
    listing: { findFirst: listingFindFirst },
    conversation: { findFirst: conversationFindFirst },
    report: {
      findFirst: reportFindFirst,
      create: reportCreate,
    },
    $transaction: transaction,
  };

  const service = new ReportsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    userFindFirst.mockResolvedValue({ id: 'reporter-id' });
    userFindUnique.mockResolvedValue({ id: 'reported-id' });
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      userId: 'advertiser-id',
    });
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      participantAId: 'advertiser-id',
      participantBId: 'reporter-id',
    });
    reportFindFirst.mockResolvedValue(null);
    reportCreate.mockResolvedValue(reportRow);
    transaction.mockImplementation((callback) => callback(database));
  });

  it('requires an active reporter account', async () => {
    userFindFirst.mockResolvedValue(null);

    await expect(
      service.submit('reporter-id', {
        reason: ReportReason.SCAM,
        reportedUserId: 'reported-id',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('requires exactly one report context', async () => {
    await expect(
      service.submit('reporter-id', {
        reason: ReportReason.SCAM,
        reportedUserId: 'reported-id',
        listingId: 'listing-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects self-reporting', async () => {
    await expect(
      service.submit('reporter-id', {
        reason: ReportReason.HARASSMENT,
        reportedUserId: 'reporter-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('derives the reported user from listing ownership', async () => {
    reportCreate.mockResolvedValue({
      ...reportRow,
      reportedUserId: 'advertiser-id',
      listingId: 'listing-id',
    });

    await service.submit('reporter-id', {
      reason: ReportReason.MISLEADING_LISTING,
      listingId: 'listing-id',
      description: '  misleading details  ',
    });

    expect(reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: 'reporter-id',
          reportedUserId: 'advertiser-id',
          listingId: 'listing-id',
          conversationId: null,
          description: 'misleading details',
        }),
      }),
    );
  });

  it('rejects reporting an owned listing', async () => {
    listingFindFirst.mockResolvedValue({
      id: 'listing-id',
      userId: 'reporter-id',
    });

    await expect(
      service.submit('reporter-id', {
        reason: ReportReason.OTHER,
        listingId: 'listing-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('derives the reported counterpart from a participant conversation', async () => {
    reportCreate.mockResolvedValue({
      ...reportRow,
      reportedUserId: 'advertiser-id',
      conversationId: 'conversation-id',
    });

    await service.submit('reporter-id', {
      reason: ReportReason.HARASSMENT,
      conversationId: 'conversation-id',
    });

    expect(reportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reportedUserId: 'advertiser-id',
          conversationId: 'conversation-id',
        }),
      }),
    );
  });

  it('hides a conversation report target from non-participants', async () => {
    conversationFindFirst.mockResolvedValue(null);

    await expect(
      service.submit('reporter-id', {
        reason: ReportReason.HARASSMENT,
        conversationId: 'foreign-conversation',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an existing open duplicate instead of creating spam', async () => {
    reportFindFirst.mockResolvedValue(reportRow);

    await expect(
      service.submit('reporter-id', {
        reason: ReportReason.SCAM,
        reportedUserId: 'reported-id',
      }),
    ).resolves.toEqual(reportRow);
    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('creates a new report after prior final reports because only open states dedupe', async () => {
    reportFindFirst.mockResolvedValue(null);

    await service.submit('reporter-id', {
      reason: ReportReason.SCAM,
      reportedUserId: 'reported-id',
    });

    expect(reportFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW],
          },
        }),
      }),
    );
    expect(reportCreate).toHaveBeenCalledTimes(1);
  });

  it('uses a reporter-safe response projection without description or admin notes', async () => {
    await service.submit('reporter-id', {
      reason: ReportReason.SCAM,
      reportedUserId: 'reported-id',
    });

    const createArgument = reportCreate.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };
    expect(createArgument.select).not.toHaveProperty('description');
    expect(createArgument.select).not.toHaveProperty('adminNotes');
    expect(createArgument.select).not.toHaveProperty('reporter');
  });
});
