import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicListingSearchQueryDto } from './dto/public-listing-search-query.dto';
import { PublicListingSearchService } from './public-listing-search.service';

@ApiTags('Discovery')
@Controller('discovery/listings')
export class PublicListingSearchController {
  constructor(
    private readonly publicListingSearchService: PublicListingSearchService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search public Beta 1 accommodation inventory' })
  @ApiOkResponse({ description: 'Paginated public listing discovery results.' })
  search(@Query() query: PublicListingSearchQueryDto) {
    return this.publicListingSearchService.search(query);
  }
}
