import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';

jest.mock('../../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { JwtStrategy } from './jwt.strategy';

const ACCESS_SECRET = 'a'.repeat(64);

function fingerprint(passwordHash: string) {
  return createHash('sha256').update(passwordHash).digest('base64url');
}

describe('JwtStrategy password rotation', () => {
  it('accepts the current password fingerprint and rejects the previous one', async () => {
    const oldPasswordHash = await argon2.hash('Password123');
    const newPasswordHash = await argon2.hash('NewPassword123');
    let currentPasswordHash = oldPasswordHash;

    const database = {
      user: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'user-1',
            email: 'rafael@morada.test',
            passwordHash: currentPasswordHash,
            status: 'ACTIVE',
          }),
        ),
      },
    };

    const strategy = new JwtStrategy(
      new ConfigService({ JWT_ACCESS_SECRET: ACCESS_SECRET }),
      database as never,
    );

    const payload = {
      sub: 'user-1',
      email: 'rafael@morada.test',
      pwd: fingerprint(oldPasswordHash),
      kind: 'access' as const,
    };

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'user-1',
      email: 'rafael@morada.test',
    });

    currentPasswordHash = newPasswordHash;

    await expect(strategy.validate(payload)).rejects.toThrow(
      'Invalid access token',
    );
  });
});
