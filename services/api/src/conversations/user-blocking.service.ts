import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { UserStatus } from '../generated/prisma/enums';

@Injectable()
export class UserBlockingService {
  constructor(private readonly database: DatabaseService) {}

  async block(blockerId: string, blockedId: string) {
    this.assertDifferentUsers(blockerId, blockedId);
    await this.assertActiveUser(blockerId);
    await this.assertTargetExists(blockedId);

    const block = await this.database.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
      create: {
        blockerId,
        blockedId,
      },
      update: {},
      select: {
        blockedId: true,
        createdAt: true,
      },
    });

    return {
      blockedUserId: block.blockedId,
      blocked: true,
      createdAt: block.createdAt,
    };
  }

  async unblock(blockerId: string, blockedId: string) {
    this.assertDifferentUsers(blockerId, blockedId);
    await this.assertActiveUser(blockerId);

    await this.database.block.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });

    return {
      blockedUserId: blockedId,
      blocked: false,
    };
  }

  async list(blockerId: string) {
    await this.assertActiveUser(blockerId);

    return this.database.block.findMany({
      where: { blockerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        blockedId: true,
        createdAt: true,
        blocked: {
          select: {
            profile: {
              select: {
                displayName: true,
                profilePhotoUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async assertNoBlockBetween(userAId: string, userBId: string): Promise<void> {
    const block = await this.database.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
      select: { id: true },
    });

    if (block) {
      throw new ForbiddenException('Direct contact is not available.');
    }
  }

  private assertDifferentUsers(blockerId: string, blockedId: string): void {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself.');
    }
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

  private async assertTargetExists(userId: string): Promise<void> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }
}
