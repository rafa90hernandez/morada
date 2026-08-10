import { Module } from '@nestjs/common';

import { AdminGuard } from '../auth/guards/admin.guard';
import { DatabaseModule } from '../database/database.module';
import { AdminListingLocationController } from './admin-listing-location.controller';
import { AdminListingRevisionController } from './admin-listing-revision.controller';
import { ListingAuthorizationController } from './listing-authorization.controller';
import { ListingAuthorizationEvidenceProcessor } from './listing-authorization-evidence.processor';
import { ListingAuthorizationSubmissionService } from './listing-authorization-submission.service';
import { ListingLocationController } from './listing-location.controller';
import { ListingLocationService } from './listing-location.service';
import { ListingModerationController } from './listing-moderation.controller';
import { ListingModerationService } from './listing-moderation.service';
import { ListingRevisionService } from './listing-revision.service';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ListingsController,
    ListingLocationController,
    ListingAuthorizationController,
    ListingModerationController,
    AdminListingLocationController,
    AdminListingRevisionController,
  ],
  providers: [
    ListingsService,
    ListingLocationService,
    ListingAuthorizationEvidenceProcessor,
    ListingAuthorizationSubmissionService,
    ListingModerationService,
    ListingRevisionService,
    ListingsRepository,
    AdminGuard,
  ],
  exports: [ListingsRepository],
})
export class ListingsModule {}
