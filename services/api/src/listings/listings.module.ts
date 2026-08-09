import { Module } from '@nestjs/common';

import { AdminGuard } from '../auth/guards/admin.guard';
import { DatabaseModule } from '../database/database.module';
import { AdminListingLocationController } from './admin-listing-location.controller';
import { ListingLocationController } from './listing-location.controller';
import { ListingLocationService } from './listing-location.service';
import { ListingModerationController } from './listing-moderation.controller';
import { ListingModerationService } from './listing-moderation.service';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ListingsController,
    ListingLocationController,
    ListingModerationController,
    AdminListingLocationController,
  ],
  providers: [
    ListingsService,
    ListingLocationService,
    ListingModerationService,
    ListingsRepository,
    AdminGuard,
  ],
  exports: [ListingsRepository],
})
export class ListingsModule {}
