import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicMapBoundsQueryDto } from './dto/public-map-bounds-query.dto';
import { PublicMapDiscoveryService } from './public-map-discovery.service';

@ApiTags('Discovery')
@Controller('discovery/map')
export class PublicMapDiscoveryController {
  constructor(
    private readonly publicMapDiscoveryService: PublicMapDiscoveryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get approximate listing markers in a visible area',
  })
  @ApiOkResponse({ description: 'Approximate clustering-friendly markers.' })
  search(@Query() query: PublicMapBoundsQueryDto) {
    return this.publicMapDiscoveryService.searchVisibleArea(query);
  }
}
