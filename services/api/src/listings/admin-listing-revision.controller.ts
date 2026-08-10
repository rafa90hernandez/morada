import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingRevisionService } from './listing-revision.service';

@ApiTags('Admin listings')
@Controller('admin/listings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminListingRevisionController {
  constructor(private readonly listingRevisionService: ListingRevisionService) {}

  @Get(':id/revisions')
  @ApiOperation({
    summary: 'Read material listing revisions for moderation',
  })
  listRevisions(@Param('id') listingId: string) {
    return this.listingRevisionService.listForAdmin(listingId);
  }
}
