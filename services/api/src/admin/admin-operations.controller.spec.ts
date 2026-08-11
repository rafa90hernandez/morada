import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOperationsController } from './admin-operations.controller';

describe('AdminOperationsController', () => {
  it('requires JWT authentication and the database-backed admin guard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminOperationsController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });
});
