import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PublicListingSearchQueryDto } from './dto/public-listing-search-query.dto';
import { PublicListingSearchService } from './public-listing-search.service';

@Controller('discovery/me/listings')
@UseGuards(JwtAuthGuard)
export class AuthenticatedListingSearchController {
  constructor(private readonly service: PublicListingSearchService) {}

  @Get()
  search(
    @Req() request: { user: { id: string } },
    @Query() query: PublicListingSearchQueryDto,
  ) {
    return this.service.search(query, new Date(), request.user.id);
  }
}
