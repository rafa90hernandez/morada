import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CloseListingDto } from './dto/close-listing.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { MyListingsQueryDto } from './dto/my-listings-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingLifecycleService } from './listing-lifecycle.service';
import { ListingsService } from './listings.service';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly listingLifecycleService: ListingLifecycleService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({
    summary: 'Create a listing and submit it for review',
  })
  @ApiCreatedResponse({
    description: 'Listing created successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required.',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateListingDto) {
    return this.listingsService.create(userId, dto);
  }

  /*
   * Rotas “me” precisam ficar antes de “:id”.
   * Caso contrário, o Nest pode interpretar “me” como um ID.
   */

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({
    summary: 'List the authenticated user listings',
  })
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: MyListingsQueryDto,
  ) {
    return this.listingsService.findMine(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me/:id')
  @ApiOperation({
    summary: 'Get one listing owned by the authenticated user',
  })
  findMineById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listingsService.findMineById(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a listing owned by the authenticated user',
  })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.update(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post(':id/pause')
  @ApiOperation({
    summary: 'Pause an active listing',
  })
  pause(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listingsService.pause(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post(':id/reactivate')
  @ApiOperation({
    summary: 'Reactivate a paused listing',
  })
  reactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listingsService.reactivate(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post(':id/resubmit')
  @ApiOperation({
    summary: 'Resubmit a rejected listing for moderation',
  })
  resubmit(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listingsService.resubmit(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post(':id/renew')
  @ApiOperation({
    summary: 'Renew an eligible active listing for another 45 days',
  })
  renew(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listingLifecycleService.renew(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post(':id/close')
  @ApiOperation({
    summary: 'Close a listing with a structured reason',
  })
  close(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CloseListingDto,
  ) {
    return this.listingLifecycleService.close(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @ApiOperation({
    summary: 'Soft delete a listing',
  })
  softDelete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.listingsService.softDelete(userId, id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an active, non-expired public listing by ID',
  })
  @ApiOkResponse({
    description: 'Listing returned successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Active non-expired listing not found.',
  })
  findPublicById(@Param('id') id: string) {
    return this.listingLifecycleService.findPublicById(id);
  }
}
