import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApproveListingAuthorizationDto } from './dto/approve-listing-authorization.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { ListingAuthorizationReviewService } from './listing-authorization-review.service';

@ApiTags('Admin Listings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/listings/:listingId/authorization')
export class ListingAuthorizationReviewController {
  constructor(
    private readonly reviewService: ListingAuthorizationReviewService,
  ) {}

  @Get('latest')
  @ApiOperation({ summary: 'Read latest right-to-advertise review attempt' })
  @ApiOkResponse({ description: 'Safe authorization review metadata.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Administrator access required.' })
  @ApiNotFoundResponse({ description: 'Authorization submission not found.' })
  getLatest(@Param('listingId') listingId: string) {
    return this.reviewService.getLatestForAdmin(listingId);
  }

  @Get('submissions/:submissionId/evidence/:evidenceId')
  @ApiOperation({ summary: 'View private right-to-advertise evidence' })
  async readEvidence(
    @CurrentUser('id') adminId: string,
    @Param('listingId') listingId: string,
    @Param('submissionId') submissionId: string,
    @Param('evidenceId') evidenceId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const evidence = await this.reviewService.readEvidence(
      adminId,
      listingId,
      submissionId,
      evidenceId,
    );

    response.setHeader('Content-Type', evidence.mimeType);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="listing-authorization-${evidenceId}"`,
    );

    return new StreamableFile(evidence.buffer);
  }

  @Post('submissions/:submissionId/approve')
  approve(
    @CurrentUser('id') adminId: string,
    @Param('listingId') listingId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: ApproveListingAuthorizationDto,
  ) {
    return this.reviewService.approve(adminId, listingId, submissionId, dto);
  }

  @Post('submissions/:submissionId/request-correction')
  requestCorrection(
    @CurrentUser('id') adminId: string,
    @Param('listingId') listingId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: RejectListingDto,
  ) {
    return this.reviewService.requestCorrection(
      adminId,
      listingId,
      submissionId,
      dto.reason,
    );
  }

  @Post('submissions/:submissionId/reject')
  reject(
    @CurrentUser('id') adminId: string,
    @Param('listingId') listingId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: RejectListingDto,
  ) {
    return this.reviewService.reject(
      adminId,
      listingId,
      submissionId,
      dto.reason,
    );
  }
}
