import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ListingTrustService } from './listing-trust.service';

@ApiTags('Listings')
@Controller('listings')
export class ListingTrustController {
  constructor(private readonly listingTrustService: ListingTrustService) {}

  @Get(':id/trust')
  @ApiOperation({ summary: 'Read precise public trust signals for a listing' })
  @ApiOkResponse({ description: 'Public-safe verification semantics.' })
  @ApiNotFoundResponse({ description: 'Active listing not found.' })
  getTrust(@Param('id') id: string) {
    return this.listingTrustService.getPublicTrust(id);
  }
}
