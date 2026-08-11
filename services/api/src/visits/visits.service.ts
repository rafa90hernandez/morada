import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';
import {
  ConversationStatus,
  ListingStatus,
  UserStatus,
  VisitStatus,
} from '../generated/prisma/enums';
import type { CreateVisitDto } from './dto/create-visit.dto';
import { VisitOutcome } from './dto/visit-outcome.dto';

const MAX_VISIT_DURATION_MS = 4 * 60 * 60 * 1000;
const MAX_VISIT_ADVANCE_MS = 90 * 24 * 60 * 60 * 1000;

const visitSelect = {
  id: true,
  listingId: true,
  conversationId: true,
  requesterId: true,
  responderId: true,
  replacementForId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  proposedAt: true,
  respondedAt: true,
  cancelledAt: true,
  outcomeAt: true,
  outcomeById: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class VisitsService {
  constructor(private readonly database: DatabaseService) {}

  async propose(
    userId: string,
    conversationId: string,
    dto: CreateVisitDto,
    now = new Date(),
  ) {
    await this.assertActiveUser(userId);
    const window = this.parseWindow(dto, now);
    const conversation = await this.getSendableConversation(
      userId,
      conversationId,
    );
    const responderId =
      conversation.participantAId === userId
        ? conversation.participantBId
        : conversation.participantAId;

    await this.assertActiveUser(responderId);
    await this.assertNoBlockBetween(userId, responderId);

    return this.database.$transaction(
      async (transaction) => {
        const currentConversation = await transaction.conversation.findFirst({
          where: {
            id: conversationId,
            status: ConversationStatus.ACTIVE,
            OR: [{ participantAId: userId }, { participantBId: userId }],
            listing: {
              status: ListingStatus.ACTIVE,
              deletedAt: null,
            },
          },
          select: {
            id: true,
            listingId: true,
            participantAId: true,
            participantBId: true,
          },
        });

        if (!currentConversation) {
          throw new ForbiddenException(
            'Conversation is not currently eligible for a visit.',
          );
        }

        const blocked = await transaction.block.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: responderId },
              { blockerId: responderId, blockedId: userId },
            ],
          },
          select: { id: true },
        });

        if (blocked) {
          throw new ForbiddenException(
            'A visit cannot be proposed between blocked users.',
          );
        }

        return transaction.visit.create({
          data: {
            listingId: currentConversation.listingId,
            conversationId,
            requesterId: userId,
            responderId,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            proposedAt: now,
          },
          select: visitSelect,
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  listMine(userId: string) {
    return this.database.visit.findMany({
      where: {
        OR: [{ requesterId: userId }, { responderId: userId }],
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
      select: visitSelect,
    });
  }

  async getMine(userId: string, visitId: string) {
    const visit = await this.database.visit.findFirst({
      where: {
        id: visitId,
        OR: [{ requesterId: userId }, { responderId: userId }],
      },
      select: visitSelect,
    });

    if (!visit) {
      throw new NotFoundException('Visit not found.');
    }

    return visit;
  }

  async accept(userId: string, visitId: string, now = new Date()) {
    await this.assertActiveUser(userId);

    return this.database.$transaction(
      async (transaction) => {
        const current = await transaction.visit.findUnique({
          where: { id: visitId },
          select: visitSelect,
        });

        if (!current || current.responderId !== userId) {
          throw new NotFoundException('Visit not found.');
        }

        if (current.status !== VisitStatus.PROPOSED) {
          throw new BadRequestException(
            'Only a proposed visit can be accepted.',
          );
        }

        if (current.startsAt.getTime() <= now.getTime()) {
          throw new BadRequestException(
            'A past visit proposal cannot be accepted.',
          );
        }

        await this.assertTransactionVisitIsContactable(
          transaction,
          current.conversationId,
          current.requesterId,
          current.responderId,
        );

        const visit = await transaction.visit.update({
          where: { id: visitId },
          data: {
            status: VisitStatus.ACCEPTED,
            respondedAt: now,
          },
          select: visitSelect,
        });

        const conflicts = await transaction.visit.findMany({
          where: {
            id: { not: visitId },
            listingId: current.listingId,
            status: VisitStatus.ACCEPTED,
            startsAt: { lt: current.endsAt },
            endsAt: { gt: current.startsAt },
          },
          orderBy: { startsAt: 'asc' },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
          },
        });

        return {
          visit,
          overlapWarning: conflicts.length > 0,
          conflicts,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  decline(userId: string, visitId: string, now = new Date()) {
    return this.respondToProposal(userId, visitId, VisitStatus.DECLINED, now);
  }

  async proposeReplacement(
    userId: string,
    visitId: string,
    dto: CreateVisitDto,
    now = new Date(),
  ) {
    await this.assertActiveUser(userId);
    const window = this.parseWindow(dto, now);

    return this.database.$transaction(
      async (transaction) => {
        const current = await transaction.visit.findUnique({
          where: { id: visitId },
          select: visitSelect,
        });

        if (!current || current.responderId !== userId) {
          throw new NotFoundException('Visit not found.');
        }

        if (current.status !== VisitStatus.PROPOSED) {
          throw new BadRequestException(
            'Only a proposed visit can receive a replacement proposal.',
          );
        }

        await this.assertTransactionVisitIsContactable(
          transaction,
          current.conversationId,
          current.requesterId,
          current.responderId,
        );

        await transaction.visit.update({
          where: { id: visitId },
          data: {
            status: VisitStatus.REPLACED,
            respondedAt: now,
          },
          select: { id: true },
        });

        return transaction.visit.create({
          data: {
            listingId: current.listingId,
            conversationId: current.conversationId,
            requesterId: userId,
            responderId: current.requesterId,
            replacementForId: current.id,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            proposedAt: now,
          },
          select: visitSelect,
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async cancel(userId: string, visitId: string, now = new Date()) {
    await this.assertActiveUser(userId);

    return this.database.$transaction(async (transaction) => {
      const current = await transaction.visit.findFirst({
        where: {
          id: visitId,
          OR: [{ requesterId: userId }, { responderId: userId }],
        },
        select: visitSelect,
      });

      if (!current) {
        throw new NotFoundException('Visit not found.');
      }

      if (
        current.status !== VisitStatus.PROPOSED &&
        current.status !== VisitStatus.ACCEPTED
      ) {
        throw new BadRequestException(
          'Only a proposed or accepted visit can be cancelled.',
        );
      }

      return transaction.visit.update({
        where: { id: visitId },
        data: {
          status: VisitStatus.CANCELLED,
          cancelledAt: now,
        },
        select: visitSelect,
      });
    });
  }

  async recordOutcome(
    userId: string,
    visitId: string,
    outcome: VisitOutcome,
    now = new Date(),
  ) {
    await this.assertActiveUser(userId);

    return this.database.$transaction(async (transaction) => {
      const current = await transaction.visit.findFirst({
        where: {
          id: visitId,
          OR: [{ requesterId: userId }, { responderId: userId }],
        },
        select: visitSelect,
      });

      if (!current) {
        throw new NotFoundException('Visit not found.');
      }

      if (current.status !== VisitStatus.ACCEPTED) {
        throw new BadRequestException(
          'Only an accepted visit can receive an outcome.',
        );
      }

      if (current.endsAt.getTime() > now.getTime()) {
        throw new BadRequestException(
          'A visit outcome can only be recorded after the scheduled end.',
        );
      }

      return transaction.visit.update({
        where: { id: visitId },
        data: {
          status:
            outcome === VisitOutcome.NO_SHOW
              ? VisitStatus.NO_SHOW
              : VisitStatus.COMPLETED,
          outcomeAt: now,
          outcomeById: userId,
        },
        select: visitSelect,
      });
    });
  }

  async getExactLocation(userId: string, visitId: string, now = new Date()) {
    await this.assertActiveUser(userId);

    const visit = await this.database.visit.findFirst({
      where: {
        id: visitId,
        status: VisitStatus.ACCEPTED,
        endsAt: { gt: now },
        OR: [{ requesterId: userId }, { responderId: userId }],
      },
      select: {
        id: true,
        listingId: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('Visit location is not available.');
    }

    const location = await this.database.listingPrivateLocation.findUnique({
      where: { listingId: visit.listingId },
      select: {
        addressLine1: true,
        addressLine2: true,
        eircode: true,
        exactLatitude: true,
        exactLongitude: true,
      },
    });

    if (!location) {
      throw new NotFoundException('Visit location is not available.');
    }

    return location;
  }

  private async respondToProposal(
    userId: string,
    visitId: string,
    status: VisitStatus.DECLINED,
    now: Date,
  ) {
    await this.assertActiveUser(userId);

    return this.database.$transaction(async (transaction) => {
      const current = await transaction.visit.findUnique({
        where: { id: visitId },
        select: visitSelect,
      });

      if (!current || current.responderId !== userId) {
        throw new NotFoundException('Visit not found.');
      }

      if (current.status !== VisitStatus.PROPOSED) {
        throw new BadRequestException(
          'Only a proposed visit can receive this response.',
        );
      }

      return transaction.visit.update({
        where: { id: visitId },
        data: {
          status,
          respondedAt: now,
        },
        select: visitSelect,
      });
    });
  }

  private async getSendableConversation(
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.database.conversation.findFirst({
      where: {
        id: conversationId,
        status: ConversationStatus.ACTIVE,
        OR: [{ participantAId: userId }, { participantBId: userId }],
        listing: {
          status: ListingStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        listingId: true,
        participantAId: true,
        participantBId: true,
      },
    });

    if (!conversation) {
      throw new ForbiddenException(
        'Conversation is not currently eligible for a visit.',
      );
    }

    return conversation;
  }

  private async assertActiveUser(userId: string): Promise<void> {
    const user = await this.database.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException('Active account required.');
    }
  }

  private async assertNoBlockBetween(userAId: string, userBId: string) {
    const blocked = await this.database.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
      select: { id: true },
    });

    if (blocked) {
      throw new ForbiddenException(
        'A visit cannot be proposed between blocked users.',
      );
    }
  }

  private async assertTransactionVisitIsContactable(
    transaction: Prisma.TransactionClient,
    conversationId: string,
    requesterId: string,
    responderId: string,
  ) {
    const conversation = await transaction.conversation.findFirst({
      where: {
        id: conversationId,
        status: ConversationStatus.ACTIVE,
        listing: {
          status: ListingStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    const blocked = await transaction.block.findFirst({
      where: {
        OR: [
          { blockerId: requesterId, blockedId: responderId },
          { blockerId: responderId, blockedId: requesterId },
        ],
      },
      select: { id: true },
    });

    if (!conversation || blocked) {
      throw new ForbiddenException(
        'This visit can no longer be accepted or replaced.',
      );
    }
  }

  private parseWindow(dto: CreateVisitDto, now: Date) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      startsAt.getTime() <= now.getTime() ||
      endsAt.getTime() <= startsAt.getTime()
    ) {
      throw new BadRequestException('A valid future visit window is required.');
    }

    if (endsAt.getTime() - startsAt.getTime() > MAX_VISIT_DURATION_MS) {
      throw new BadRequestException('Visit duration cannot exceed four hours.');
    }

    if (startsAt.getTime() - now.getTime() > MAX_VISIT_ADVANCE_MS) {
      throw new BadRequestException(
        'Visits cannot be proposed more than 90 days in advance.',
      );
    }

    return { startsAt, endsAt };
  }
}
