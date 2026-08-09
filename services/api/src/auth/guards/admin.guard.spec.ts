import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

jest.mock('../../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const findFirst = jest.fn();
  const database = {
    user: {
      findFirst,
    },
  };
  const guard = new AdminGuard(database as never);

  function contextWithUser(user?: { id: string; email: string }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows an authenticated active administrator resolved from the database', async () => {
    findFirst.mockResolvedValue({ id: 'admin-id' });

    await expect(
      guard.canActivate(
        contextWithUser({ id: 'admin-id', email: 'admin@morada.ie' }),
      ),
    ).resolves.toBe(true);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'admin-id',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });
  });

  it('denies a user who is not an active administrator', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        contextWithUser({ id: 'user-id', email: 'user@example.com' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects requests without an authenticated principal before querying the database', async () => {
    await expect(guard.canActivate(contextWithUser())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findFirst).not.toHaveBeenCalled();
  });
});
