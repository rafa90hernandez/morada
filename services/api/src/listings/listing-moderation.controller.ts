import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApproveListingDto } from './dto/approve-listing.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { ListingModerationService } from './listing-moderation.service';

@ApiTags('Admin Listings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/listings')
export class ListingModerationController {
  constructor(
    private readonly listingModerationService: ListingModerationService,
  ) {}

  @Get('review-queue')
  @ApiOperation({ summary: 'List listings waiting for manual review' })
  @ApiOkResponse({ description: 'Listing moderation queue.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Administrator access required.' })
  listQueue() {
    return this.listingModerationService.listQueue();
  }

  @Get(':id/review')
  @ApiOperation({ summary: 'Read listing moderation context' })
  @ApiOkResponse({ description: 'Safe listing moderation context.' })
  @ApiNotFoundResponse({ description: 'Listing not found.' })
  getReviewDetail(@Param('id') id: string) {
    return this.listingModerationService.getReviewDetail(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve the exact reviewed listing version' })
  @ApiOkResponse({ description: 'Listing approved and published.' })
  @ApiNotFoundResponse({ description: 'Listing not found.' })
  @ApiBadRequestResponse({
    description: 'Listing version or publication trust gates are invalid.',
  })
  approve(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: ApproveListingDto,
  ) {
    return this.listingModerationService.approve(
      adminId,
      id,
      dto.expectedUpdatedAt,
    );
  }

  @Post(':id/request-correction')
  @ApiOperation({ summary: 'Request listing corrections before publication' })
  @ApiOkResponse({ description: 'Correction requested and audited.' })
  requestCorrection(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: RejectListingDto,
  ) {
    return this.listingModerationService.requestCorrection(
      adminId,
      id,
      dto.reason,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a listing pending moderation' })
  @ApiOkResponse({ description: 'Listing rejected.' })
  @ApiNotFoundResponse({ description: 'Listing not found.' })
  @ApiBadRequestResponse({
    description: 'Listing is not pending review or the reason is invalid.',
  })
  reject(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: RejectListingDto,
  ) {
    return this.listingModerationService.reject(adminId, id, dto.reason);
  }
}
