import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PublicListingSearchQueryDto } from './dto/public-listing-search-query.dto';
import { PublicListingDetailService } from './public-listing-detail.service';
import { PublicListingSearchService } from './public-listing-search.service';

@ApiTags('Discovery')
@Controller('discovery/listings')
export class PublicListingSearchController {
  constructor(
    private readonly publicListingSearchService: PublicListingSearchService,
    private readonly publicListingDetailService: PublicListingDetailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search public Beta 1 accommodation inventory' })
  @ApiOkResponse({ description: 'Paginated public listing card results.' })
  search(@Query() query: PublicListingSearchQueryDto) {
    return this.publicListingSearchService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public Beta 1 listing detail read model' })
  @ApiOkResponse({ description: 'Privacy-safe public listing detail.' })
  @ApiNotFoundResponse({ description: 'Public eligible listing not found.' })
  detail(@Param('id') id: string) {
    return this.publicListingDetailService.getById(id);
  }
}
