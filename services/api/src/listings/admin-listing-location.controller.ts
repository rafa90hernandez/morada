import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingLocationService } from './listing-location.service';

@ApiTags('Admin listings')
@Controller('admin/listings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminListingLocationController {
  constructor(private readonly listingLocationService: ListingLocationService) {}

  @Get(':id/location')
  @ApiOperation({
    summary: 'Read exact and approximate listing location for moderation',
  })
  getLocation(@Param('id') listingId: string) {
    return this.listingLocationService.getAdminLocation(listingId);
  }
}
