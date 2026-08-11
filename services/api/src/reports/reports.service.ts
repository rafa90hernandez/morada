import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ReportStatus, UserStatus } from '../generated/prisma/enums';
import type { CreateReportDto } from './dto/create-report.dto';

type ResolvedReportTarget = {
  reportedUserId: string;
  listingId: string | null;
  conversationId: string | null;
};

const reporterReportSelect = {
  id: true,
  reason: true,
  status: true,
  reportedUserId: true,
  listingId: true,
  conversationId: true,
  createdAt: true,
} as const;

@Injectable()
export class ReportsService {
  constructor(private readonly database: DatabaseService) {}

  async submit(reporterId: string, dto: CreateReportDto) {
    await this.assertActiveReporter(reporterId);
    const target = await this.resolveTarget(reporterId, dto);
    const description = dto.description?.trim() || null;

    return this.database.$transaction(
      async (transaction) => {
        const existing = await transaction.report.findFirst({
          where: {
            reporterId,
            reason: dto.reason,
            status: {
              in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW],
            },
            ...this.targetWhere(dto, target),
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: reporterReportSelect,
        });

        if (existing) {
          return existing;
        }

        return transaction.report.create({
          data: {
            reporterId,
            reportedUserId: target.reportedUserId,
            listingId: target.listingId,
            conversationId: target.conversationId,
            reason: dto.reason,
            description,
          },
          select: reporterReportSelect,
        });
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private async resolveTarget(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ResolvedReportTarget> {
    const contexts = [
      dto.reportedUserId,
      dto.listingId,
      dto.conversationId,
    ].filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (contexts.length !== 1) {
      throw new BadRequestException(
        'Exactly one report context is required: user, listing or conversation.',
      );
    }

    if (dto.reportedUserId) {
      if (dto.reportedUserId === reporterId) {
        throw new BadRequestException('You cannot report yourself.');
      }

      const user = await this.database.user.findUnique({
        where: { id: dto.reportedUserId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('Reported user not found.');
      }

      return {
        reportedUserId: user.id,
        listingId: null,
        conversationId: null,
      };
    }

    if (dto.listingId) {
      const listing = await this.database.listing.findFirst({
        where: {
          id: dto.listingId,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!listing) {
        throw new NotFoundException('Listing not found.');
      }

      if (listing.userId === reporterId) {
        throw new BadRequestException('You cannot report your own listing.');
      }

      return {
        reportedUserId: listing.userId,
        listingId: listing.id,
        conversationId: null,
      };
    }

    const conversation = await this.database.conversation.findFirst({
      where: {
        id: dto.conversationId,
        OR: [{ participantAId: reporterId }, { participantBId: reporterId }],
      },
      select: {
        id: true,
        participantAId: true,
        participantBId: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return {
      reportedUserId:
        conversation.participantAId === reporterId
          ? conversation.participantBId
          : conversation.participantAId,
      listingId: null,
      conversationId: conversation.id,
    };
  }

  private targetWhere(dto: CreateReportDto, target: ResolvedReportTarget) {
    if (dto.listingId) {
      return {
        listingId: target.listingId,
      };
    }

    if (dto.conversationId) {
      return {
        conversationId: target.conversationId,
      };
    }

    return {
      reportedUserId: target.reportedUserId,
      listingId: null,
      conversationId: null,
    };
  }

  private async assertActiveReporter(reporterId: string): Promise<void> {
    const reporter = await this.database.user.findFirst({
      where: {
        id: reporterId,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!reporter) {
      throw new ForbiddenException('Active account required.');
    }
  }
}
