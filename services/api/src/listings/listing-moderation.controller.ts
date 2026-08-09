import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
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

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a listing pending moderation' })
  @ApiOkResponse({ description: 'Listing approved and published.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Administrator access required.' })
  @ApiNotFoundResponse({ description: 'Listing not found.' })
  @ApiBadRequestResponse({ description: 'Listing is not pending review.' })
  approve(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.listingModerationService.approve(adminId, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a listing pending moderation' })
  @ApiOkResponse({ description: 'Listing rejected.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Administrator access required.' })
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
