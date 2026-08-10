import 'reflect-metadata';

import { GUARDS_METADATA } from '@nestjs/common/constants';

jest.mock('../auth/guards/admin.guard', () => ({
  AdminGuard: class AdminGuard {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

jest.mock('./listing-revision.service', () => ({
  ListingRevisionService: class ListingRevisionService {},
}));

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminListingRevisionController } from './admin-listing-revision.controller';

describe('AdminListingRevisionController authorization', () => {
  it('requires database-backed admin authorization', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminListingRevisionController,
    );

    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });
});
