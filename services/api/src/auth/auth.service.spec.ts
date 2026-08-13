import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const ACCESS_SECRET = 'a'.repeat(64);
const REFRESH_SECRET = 'b'.repeat(64);

type TestUser = {
  id: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  status: 'ACTIVE';
};

function createHarness(options?: { exposeDevelopmentToken?: boolean }) {
  const user: TestUser = {
    id: 'user-1',
    email: 'rafael@morada.test',
    passwordHash: '',
    refreshTokenHash: null,
    status: 'ACTIVE',
  };

  const database = {
    user: {
      update: jest.fn(({ data }: { data: Partial<TestUser> }) => {
        Object.assign(user, data);
        return Promise.resolve(user);
      }),
    },
  } as unknown as DatabaseService;

  const usersService = {
    findByEmail: jest.fn((email: string) =>
      Promise.resolve(email === user.email ? user : null),
    ),
    findById: jest.fn((id: string) =>
      Promise.resolve(id === user.id ? user : null),
    ),
  } as unknown as UsersService;

  const jwtService = new JwtService();
  const config = new ConfigService({
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    PASSWORD_RECOVERY_DEV_TOKEN: options?.exposeDevelopmentToken
      ? 'true'
      : 'false',
  });

  const service = new AuthService(database, usersService, jwtService, config);

  return { service, user, usersService, database, jwtService };
}

describe('AuthService password recovery', () => {
  it('returns the same public response for existing and unknown emails', async () => {
    const { service, user } = createHarness();
    user.passwordHash = await argon2.hash('Password123');

    await expect(
      service.requestPasswordRecovery({ email: user.email }),
    ).resolves.toEqual({ accepted: true });
    await expect(
      service.requestPasswordRecovery({ email: 'unknown@morada.test' }),
    ).resolves.toEqual({ accepted: true });
  });

  it('exposes a recovery token only in the explicit non-production development path', async () => {
    const { service, user } = createHarness({ exposeDevelopmentToken: true });
    user.passwordHash = await argon2.hash('Password123');

    const result = await service.requestPasswordRecovery({ email: user.email });

    expect(result.accepted).toBe(true);
    expect(result.developmentToken).toEqual(expect.any(String));
  });

  it('rejects an expired recovery token', async () => {
    const { service, user, jwtService } = createHarness();
    user.passwordHash = await argon2.hash('Password123');

    const expiredToken = await jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        pwd: 'irrelevant',
        kind: 'password-recovery',
      },
      { secret: REFRESH_SECRET, expiresIn: -1 },
    );

    await expect(
      service.resetPassword({
        token: expiredToken,
        password: 'NewPassword123',
      }),
    ).rejects.toThrow('Invalid or expired recovery token.');
  });

  it('makes a recovery token one-time by binding it to the current password hash', async () => {
    const { service, user } = createHarness({ exposeDevelopmentToken: true });
    user.passwordHash = await argon2.hash('Password123');
    const request = await service.requestPasswordRecovery({
      email: user.email,
    });
    const token = request.developmentToken;

    expect(token).toEqual(expect.any(String));
    await expect(
      service.resetPassword({ token: token!, password: 'NewPassword123' }),
    ).resolves.toEqual({ reset: true });
    await expect(
      service.resetPassword({ token: token!, password: 'AnotherPassword123' }),
    ).rejects.toThrow('Invalid or expired recovery token.');
  });

  it('revokes the stored refresh token when the password changes', async () => {
    const { service, user } = createHarness({ exposeDevelopmentToken: true });
    user.passwordHash = await argon2.hash('Password123');
    user.refreshTokenHash = await argon2.hash('old-refresh-token');
    const request = await service.requestPasswordRecovery({
      email: user.email,
    });

    await service.resetPassword({
      token: request.developmentToken!,
      password: 'NewPassword123',
    });

    expect(user.refreshTokenHash).toBeNull();
    expect(await argon2.verify(user.passwordHash, 'NewPassword123')).toBe(true);
  });

  it('rejects a previously issued refresh token after a password reset', async () => {
    const { service, user } = createHarness({ exposeDevelopmentToken: true });
    user.passwordHash = await argon2.hash('Password123');

    const session = await service.login({
      email: user.email,
      password: 'Password123',
    });
    const recovery = await service.requestPasswordRecovery({
      email: user.email,
    });

    await service.resetPassword({
      token: recovery.developmentToken!,
      password: 'NewPassword123',
    });

    await expect(
      service.refresh({ refreshToken: session.refreshToken }),
    ).rejects.toThrow('Invalid refresh token.');
  });
});
