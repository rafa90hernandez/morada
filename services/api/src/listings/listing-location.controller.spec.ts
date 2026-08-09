import 'reflect-metadata';

import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminListingLocationController } from './admin-listing-location.controller';
import { ListingLocationController } from './listing-location.controller';

function getMethod(target: object, propertyKey: string) {
  return Object.getOwnPropertyDescriptor(target, propertyKey)?.value;
}

describe('listing location authorization metadata', () => {
  it('requires database-backed admin authorization for admin location reads', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminListingLocationController,
    );

    expect(guards).toEqual([JwtAuthGuard, AdminGuard]);
  });

  it('requires authentication for owner exact-location reads and writes', () => {
    const writeGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      getMethod(ListingLocationController.prototype, 'setOwnerLocation'),
    );
    const readGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      getMethod(ListingLocationController.prototype, 'getOwnerLocation'),
    );

    expect(writeGuards).toEqual([JwtAuthGuard]);
    expect(readGuards).toEqual([JwtAuthGuard]);
  });

  it('keeps the approximate public-location read unguarded', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      getMethod(ListingLocationController.prototype, 'getPublicLocation'),
    );

    expect(guards).toBeUndefined();
  });
});
