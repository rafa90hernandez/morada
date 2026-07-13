import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingsService } from './listings.service';

type CurrentUserPayload = {
  id: string;
};

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({
    summary: 'Create a housing listing',
  })
  @ApiCreatedResponse({
    description: 'Listing created and sent for moderation.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required.',
  })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a listing by ID',
  })
  @ApiOkResponse({
    description: 'Listing returned successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Listing not found.',
  })
  findById(@Param('id') id: string) {
    return this.listingsService.findById(id);
  }
}
