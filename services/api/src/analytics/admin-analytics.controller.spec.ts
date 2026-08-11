import { GUARDS_METADATA } from '@nestjs/common/constants';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminAnalyticsController } from './admin-analytics.controller';

describe('AdminAnalyticsController', () => {
  it('requires JWT authentication and the database-backed admin guard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminAnalyticsController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });
});
