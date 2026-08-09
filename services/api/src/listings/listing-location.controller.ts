import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingPrivateLocationDto } from './dto/listing-private-location.dto';
import { ListingLocationService } from './listing-location.service';

@ApiTags('Listing location')
@Controller('listings')
export class ListingLocationController {
  constructor(private readonly listingLocationService: ListingLocationService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Put('me/:id/location')
  @ApiOperation({
    summary: 'Set the exact private location for an owned listing',
  })
  setOwnerLocation(
    @CurrentUser('id') userId: string,
    @Param('id') listingId: string,
    @Body() dto: ListingPrivateLocationDto,
  ) {
    return this.listingLocationService.setOwnerLocation(userId, listingId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me/:id/location')
  @ApiOperation({
    summary: 'Read exact and approximate location for an owned listing',
  })
  getOwnerLocation(
    @CurrentUser('id') userId: string,
    @Param('id') listingId: string,
  ) {
    return this.listingLocationService.getOwnerLocation(userId, listingId);
  }

  @Get(':id/location')
  @ApiOperation({
    summary: 'Read only the approximate public location of an active listing',
  })
  @ApiOkResponse({
    description: 'Approximate location returned without exact address data.',
  })
  getPublicLocation(@Param('id') listingId: string) {
    return this.listingLocationService.getPublicLocation(listingId);
  }
}
