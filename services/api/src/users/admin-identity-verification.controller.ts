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
import { AdminIdentityVerificationService } from './admin-identity-verification.service';
import { RejectIdentityVerificationDto } from './dto/reject-identity-verification.dto';

@ApiTags('Admin Identity Verification')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/identity-verification')
export class AdminIdentityVerificationController {
  constructor(
    private readonly reviewService: AdminIdentityVerificationService,
  ) {}

  @Get('submissions')
  @ApiOperation({ summary: 'List identity submissions awaiting manual review' })
  @ApiOkResponse({ description: 'Identity verification review queue.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Administrator access required.' })
  listQueue() {
    return this.reviewService.listQueue();
  }

  @Get('submissions/:submissionId')
  @ApiOperation({ summary: 'Read a private identity verification submission' })
  @ApiOkResponse({ description: 'Safe review metadata and evidence IDs.' })
  @ApiNotFoundResponse({ description: 'Submission not found.' })
  getSubmission(@Param('submissionId') submissionId: string) {
    return this.reviewService.getSubmission(submissionId);
  }

  @Get('submissions/:submissionId/evidence/:evidenceId')
  @ApiOperation({ summary: 'View one private identity verification image' })
  @ApiOkResponse({ description: 'Private evidence image.' })
  @ApiNotFoundResponse({ description: 'Evidence not found.' })
  async readEvidence(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Param('evidenceId') evidenceId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const evidence = await this.reviewService.readEvidence(
      adminId,
      submissionId,
      evidenceId,
    );

    response.setHeader('Content-Type', evidence.mimeType);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="identity-evidence-${evidenceId}.jpg"`,
    );

    return new StreamableFile(evidence.buffer);
  }

  @Post('submissions/:submissionId/approve')
  @ApiOperation({ summary: 'Approve an identity verification submission' })
  @ApiOkResponse({ description: 'Identity verification approved.' })
  approve(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.reviewService.approve(adminId, submissionId);
  }

  @Post('submissions/:submissionId/reject')
  @ApiOperation({ summary: 'Reject an identity verification submission' })
  @ApiOkResponse({ description: 'Identity verification rejected.' })
  reject(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: RejectIdentityVerificationDto,
  ) {
    return this.reviewService.reject(adminId, submissionId, dto.reason);
  }
}
