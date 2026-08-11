import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('Admin Analytics')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@ApiForbiddenResponse({ description: 'Administrator access required.' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Read privacy-safe Beta 1 product aggregates' })
  @ApiOkResponse({
    description: 'Aggregate funnel counts and review turnaround metrics.',
  })
  getSummary() {
    return this.analyticsService.getSummary();
  }
}
