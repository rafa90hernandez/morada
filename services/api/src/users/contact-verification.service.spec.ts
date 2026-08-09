import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ContactVerificationService } from './contact-verification.service';

describe('ContactVerificationService', () => {
  const findVerification = jest.fn();
  const updateVerification = jest.fn();
  const updateUser = jest.fn();

  const transaction = {
    verification: {
      findUnique: findVerification,
      update: updateVerification,
    },
    user: {
      update: updateUser,
    },
  };

  const $transaction = jest.fn(
    async (
      callback: (client: typeof transaction) => Promise<unknown>,
    ): Promise<unknown> => callback(transaction),
  );

  const service = new ContactVerificationService({ $transaction } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findVerification.mockResolvedValue({ id: 'verification-id' });
  });

  it('marks email verified and mirrors the legacy boolean atomically', async () => {
    const verifiedAt = new Date('2026-08-01T10:00:00.000Z');

    await expect(
      service.markEmailVerified('user-id', verifiedAt),
    ).resolves.toEqual({
      channel: 'EMAIL',
      verifiedAt,
    });

    expect(updateVerification).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      data: { emailVerifiedAt: verifiedAt },
    });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { emailVerified: true },
    });
  });

  it('marks phone verified with a normalized provider and mirrors the legacy boolean', async () => {
    const verifiedAt = new Date('2026-08-01T10:00:00.000Z');

    await expect(
      service.markPhoneVerified('user-id', '  provider-example  ', verifiedAt),
    ).resolves.toEqual({
      channel: 'PHONE',
      verifiedAt,
      provider: 'provider-example',
    });

    expect(updateVerification).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      data: {
        phoneVerifiedAt: verifiedAt,
        phoneVerificationProvider: 'provider-example',
      },
    });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { phoneVerified: true },
    });
  });

  it('clears phone verification timestamp, provider and legacy boolean together', async () => {
    await expect(service.clearPhoneVerification('user-id')).resolves.toEqual({
      channel: 'PHONE',
      verifiedAt: null,
    });

    expect(updateVerification).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      data: {
        phoneVerifiedAt: null,
        phoneVerificationProvider: null,
      },
    });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { phoneVerified: false },
    });
  });

  it('rejects missing verification records before changing state', async () => {
    findVerification.mockResolvedValue(null);

    await expect(
      service.markEmailVerified(
        'missing-user',
        new Date('2026-08-01T10:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(updateVerification).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects blank or oversized phone verification providers', async () => {
    await expect(
      service.markPhoneVerified('user-id', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.markPhoneVerified('user-id', 'a'.repeat(101)),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect($transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid or future verification timestamps', async () => {
    await expect(
      service.markEmailVerified('user-id', new Date('invalid')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.markEmailVerified('user-id', new Date('2999-01-01T00:00:00.000Z')),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect($transaction).not.toHaveBeenCalled();
  });
});
