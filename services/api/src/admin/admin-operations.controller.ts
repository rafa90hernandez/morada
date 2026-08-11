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
import { AdminOperationsService } from './admin-operations.service';

@ApiTags('Admin Operations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@ApiForbiddenResponse({ description: 'Administrator access required.' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/operations')
export class AdminOperationsController {
  constructor(private readonly operationsService: AdminOperationsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Read consolidated Beta 1 admin work queues' })
  @ApiOkResponse({
    description: 'Safe counts and minimal previews for pending admin work.',
  })
  getSummary() {
    return this.operationsService.getSummary();
  }
}
