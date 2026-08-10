import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List current user public-eligible favorites' })
  @ApiOkResponse({ description: 'Public-safe favorite listing cards.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  list(@CurrentUser('id') userId: string) {
    return this.favoritesService.list(userId);
  }

  @Post(':listingId')
  @ApiOperation({ summary: 'Favorite a public-eligible listing' })
  add(
    @CurrentUser('id') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.favoritesService.add(userId, listingId);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Remove a listing from current user favorites' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.favoritesService.remove(userId, listingId);
  }
}
