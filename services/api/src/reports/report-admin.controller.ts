import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportAdminDecisionDto } from './dto/report-admin-decision.dto';
import { ReportAdminService } from './report-admin.service';

@ApiTags('Admin Reports')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/reports')
export class ReportAdminController {
  constructor(private readonly reportAdminService: ReportAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List open safety reports for moderation' })
  listQueue() {
    return this.reportAdminService.listQueue();
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get private administrative report detail' })
  getDetail(@Param('reportId') reportId: string) {
    return this.reportAdminService.getDetail(reportId);
  }

  @Post(':reportId/review')
  @ApiOperation({ summary: 'Mark a report as under review' })
  markUnderReview(
    @CurrentUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ReportAdminDecisionDto,
  ) {
    return this.reportAdminService.markUnderReview(adminId, reportId, dto.notes);
  }

  @Post(':reportId/resolve')
  @ApiOperation({ summary: 'Resolve a safety report' })
  resolve(
    @CurrentUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ReportAdminDecisionDto,
  ) {
    return this.reportAdminService.resolve(adminId, reportId, dto.notes);
  }

  @Post(':reportId/dismiss')
  @ApiOperation({ summary: 'Dismiss a safety report' })
  dismiss(
    @CurrentUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ReportAdminDecisionDto,
  ) {
    return this.reportAdminService.dismiss(adminId, reportId, dto.notes);
  }

  @Post(':reportId/actions/pause-listing')
  @ApiOperation({ summary: 'Preventively pause the reported listing' })
  pauseListing(
    @CurrentUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ReportAdminDecisionDto,
  ) {
    return this.reportAdminService.pauseListing(adminId, reportId, dto.notes);
  }

  @Post(':reportId/actions/restore-listing')
  @ApiOperation({ summary: 'Restore only a pause created by this report' })
  restoreListing(
    @CurrentUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: ReportAdminDecisionDto,
  ) {
    return this.reportAdminService.restoreListing(adminId, reportId, dto.notes);
  }
}
