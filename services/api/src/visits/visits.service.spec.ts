import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { VisitStatus } from '../generated/prisma/enums';
import { VisitOutcome } from './dto/visit-outcome.dto';
import { VisitsService } from './visits.service';

const now = new Date('2026-08-11T04:00:00.000Z');
const startsAt = new Date('2026-08-12T10:00:00.000Z');
const endsAt = new Date('2026-08-12T11:00:00.000Z');

const visitRow = {
  id: 'visit-id',
  listingId: 'listing-id',
  conversationId: 'conversation-id',
  requesterId: 'seeker-id',
  responderId: 'advertiser-id',
  replacementForId: null,
  status: VisitStatus.PROPOSED,
  startsAt,
  endsAt,
  proposedAt: now,
  respondedAt: null,
  cancelledAt: null,
  outcomeAt: null,
  outcomeById: null,
  createdAt: now,
  updatedAt: now,
};

describe('VisitsService', () => {
  const userFindFirst = jest.fn();
  const blockFindFirst = jest.fn();
  const conversationFindFirst = jest.fn();
  const visitCreate = jest.fn();
  const visitFindMany = jest.fn();
  const visitFindFirst = jest.fn();
  const visitFindUnique = jest.fn();
  const visitUpdate = jest.fn();
  const privateLocationFindUnique = jest.fn();
  const transaction = jest.fn();

  const database = {
    user: { findFirst: userFindFirst },
    block: { findFirst: blockFindFirst },
    conversation: { findFirst: conversationFindFirst },
    visit: {
      create: visitCreate,
      findMany: visitFindMany,
      findFirst: visitFindFirst,
      findUnique: visitFindUnique,
      update: visitUpdate,
    },
    listingPrivateLocation: { findUnique: privateLocationFindUnique },
    $transaction: transaction,
  };

  const service = new VisitsService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
    userFindFirst.mockResolvedValue({ id: 'active-user' });
    blockFindFirst.mockResolvedValue(null);
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-id',
      listingId: 'listing-id',
      participantAId: 'advertiser-id',
      participantBId: 'seeker-id',
    });
    visitCreate.mockResolvedValue(visitRow);
    visitFindMany.mockResolvedValue([]);
    visitFindFirst.mockResolvedValue(visitRow);
    visitFindUnique.mockResolvedValue(visitRow);
    visitUpdate.mockImplementation(({ data }) =>
      Promise.resolve({ ...visitRow, ...data }),
    );
    privateLocationFindUnique.mockResolvedValue({
      addressLine1: '1 Private Street',
      addressLine2: null,
      eircode: 'D08 TEST',
      exactLatitude: 53.34,
      exactLongitude: -6.29,
    });
    transaction.mockImplementation((callback) => callback(database));
  });

  it('derives the responder from the conversation and creates a future proposal', async () => {
    await service.propose(
      'seeker-id',
      'conversation-id',
      {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
      now,
    );

    expect(visitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-id',
          conversationId: 'conversation-id',
          requesterId: 'seeker-id',
          responderId: 'advertiser-id',
          startsAt,
          endsAt,
        }),
      }),
    );
  });

  it('rejects visit proposals between blocked participants', async () => {
    blockFindFirst.mockResolvedValue({ id: 'block-id' });

    await expect(
      service.propose(
        'seeker-id',
        'conversation-id',
        {
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(visitCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid or excessive visit windows', async () => {
    await expect(
      service.propose(
        'seeker-id',
        'conversation-id',
        {
          startsAt: startsAt.toISOString(),
          endsAt: new Date(
            startsAt.getTime() + 5 * 60 * 60 * 1000,
          ).toISOString(),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only lets the proposal responder accept', async () => {
    await expect(
      service.accept('seeker-id', 'visit-id', now),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(visitUpdate).not.toHaveBeenCalled();
  });

  it('accepts a proposal and returns explicit overlap warnings', async () => {
    visitFindUnique.mockResolvedValue(visitRow);
    visitFindMany.mockResolvedValue([
      {
        id: 'conflict-id',
        startsAt: new Date('2026-08-12T10:30:00.000Z'),
        endsAt: new Date('2026-08-12T11:30:00.000Z'),
      },
    ]);

    const result = await service.accept('advertiser-id', 'visit-id', now);

    expect(result.overlapWarning).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(visitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          listingId: 'listing-id',
          status: VisitStatus.ACCEPTED,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        }),
      }),
    );
  });

  it('turns a responder counter-proposal into a new immutable replacement visit', async () => {
    const replacement = {
      ...visitRow,
      id: 'replacement-id',
      requesterId: 'advertiser-id',
      responderId: 'seeker-id',
      replacementForId: 'visit-id',
    };
    visitCreate.mockResolvedValue(replacement);

    const result = await service.proposeReplacement(
      'advertiser-id',
      'visit-id',
      {
        startsAt: new Date('2026-08-13T10:00:00.000Z').toISOString(),
        endsAt: new Date('2026-08-13T11:00:00.000Z').toISOString(),
      },
      now,
    );

    expect(visitUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'visit-id' },
        data: expect.objectContaining({ status: VisitStatus.REPLACED }),
      }),
    );
    expect(visitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requesterId: 'advertiser-id',
          responderId: 'seeker-id',
          replacementForId: 'visit-id',
        }),
      }),
    );
    expect(result.id).toBe('replacement-id');
  });

  it('allows either participant to cancel an active proposal or accepted visit', async () => {
    await service.cancel('seeker-id', 'visit-id', now);

    expect(visitUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: VisitStatus.CANCELLED,
          cancelledAt: now,
        },
      }),
    );
  });

  it('does not record an outcome before an accepted visit has ended', async () => {
    visitFindFirst.mockResolvedValue({
      ...visitRow,
      status: VisitStatus.ACCEPTED,
    });

    await expect(
      service.recordOutcome(
        'seeker-id',
        'visit-id',
        VisitOutcome.COMPLETED,
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records post-visit completed/no-show outcomes without changing trust score', async () => {
    visitFindFirst.mockResolvedValue({
      ...visitRow,
      status: VisitStatus.ACCEPTED,
      startsAt: new Date('2026-08-10T10:00:00.000Z'),
      endsAt: new Date('2026-08-10T11:00:00.000Z'),
    });

    await service.recordOutcome(
      'seeker-id',
      'visit-id',
      VisitOutcome.NO_SHOW,
      now,
    );

    expect(visitUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: VisitStatus.NO_SHOW,
          outcomeAt: now,
          outcomeById: 'seeker-id',
        },
      }),
    );
    expect(database).not.toHaveProperty('trustScore');
  });

  it('returns exact location only after accepted visit authorization succeeds', async () => {
    visitFindFirst.mockResolvedValue({
      id: 'visit-id',
      listingId: 'listing-id',
    });

    const result = await service.getExactLocation('seeker-id', 'visit-id', now);

    expect(result.addressLine1).toBe('1 Private Street');
    expect(visitFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'visit-id',
        status: VisitStatus.ACCEPTED,
        endsAt: { gt: now },
        OR: [{ requesterId: 'seeker-id' }, { responderId: 'seeker-id' }],
      },
      select: {
        id: true,
        listingId: true,
      },
    });
  });

  it('hides exact location for declined, cancelled, completed or unauthorized visits', async () => {
    visitFindFirst.mockResolvedValue(null);

    await expect(
      service.getExactLocation('other-user', 'visit-id', now),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(privateLocationFindUnique).not.toHaveBeenCalled();
  });
});
