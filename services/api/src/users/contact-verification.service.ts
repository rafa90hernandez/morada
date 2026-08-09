import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import type { Prisma } from '../generated/prisma/client';

const MAX_PROVIDER_LENGTH = 100;

@Injectable()
export class ContactVerificationService {
  constructor(private readonly database: DatabaseService) {}

  async markEmailVerified(userId: string, verifiedAt: Date = new Date()) {
    this.validateTimestamp(verifiedAt);

    return this.database.$transaction(async (transaction) => {
      await this.ensureUserVerificationExists(transaction, userId);

      await transaction.verification.update({
        where: { userId },
        data: {
          emailVerifiedAt: verifiedAt,
        },
      });

      await transaction.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
        },
      });

      return {
        channel: 'EMAIL' as const,
        verifiedAt,
      };
    });
  }

  async clearEmailVerification(userId: string) {
    return this.database.$transaction(async (transaction) => {
      await this.ensureUserVerificationExists(transaction, userId);

      await transaction.verification.update({
        where: { userId },
        data: {
          emailVerifiedAt: null,
        },
      });

      await transaction.user.update({
        where: { id: userId },
        data: {
          emailVerified: false,
        },
      });

      return {
        channel: 'EMAIL' as const,
        verifiedAt: null,
      };
    });
  }

  async markPhoneVerified(
    userId: string,
    provider: string,
    verifiedAt: Date = new Date(),
  ) {
    this.validateTimestamp(verifiedAt);
    const normalizedProvider = this.normalizeProvider(provider);

    return this.database.$transaction(async (transaction) => {
      await this.ensureUserVerificationExists(transaction, userId);

      await transaction.verification.update({
        where: { userId },
        data: {
          phoneVerifiedAt: verifiedAt,
          phoneVerificationProvider: normalizedProvider,
        },
      });

      await transaction.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
        },
      });

      return {
        channel: 'PHONE' as const,
        verifiedAt,
        provider: normalizedProvider,
      };
    });
  }

  async clearPhoneVerification(userId: string) {
    return this.database.$transaction(async (transaction) => {
      await this.ensureUserVerificationExists(transaction, userId);

      await transaction.verification.update({
        where: { userId },
        data: {
          phoneVerifiedAt: null,
          phoneVerificationProvider: null,
        },
      });

      await transaction.user.update({
        where: { id: userId },
        data: {
          phoneVerified: false,
        },
      });

      return {
        channel: 'PHONE' as const,
        verifiedAt: null,
      };
    });
  }

  private async ensureUserVerificationExists(
    transaction: Prisma.TransactionClient,
    userId: string,
  ) {
    const verification = await transaction.verification.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!verification) {
      throw new NotFoundException('Verification record not found.');
    }
  }

  private validateTimestamp(value: Date): void {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('Verification timestamp is invalid.');
    }

    if (value.getTime() > Date.now()) {
      throw new BadRequestException(
        'Verification timestamp cannot be in the future.',
      );
    }
  }

  private normalizeProvider(provider: string): string {
    const normalizedProvider = provider.trim();

    if (!normalizedProvider) {
      throw new BadRequestException('Phone verification provider is required.');
    }

    if (normalizedProvider.length > MAX_PROVIDER_LENGTH) {
      throw new BadRequestException(
        `Phone verification provider cannot exceed ${MAX_PROVIDER_LENGTH} characters.`,
      );
    }

    return normalizedProvider;
  }
}
