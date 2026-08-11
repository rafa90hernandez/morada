import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitOutcomeDto } from './dto/visit-outcome.dto';
import { VisitsService } from './visits.service';

@ApiTags('Visits')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@UseGuards(JwtAuthGuard)
@Controller()
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('conversations/:conversationId/visits')
  @ApiOperation({ summary: 'Propose a listing visit in a conversation' })
  propose(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateVisitDto,
  ) {
    return this.visitsService.propose(userId, conversationId, dto);
  }

  @Get('visits')
  @ApiOperation({ summary: 'List visits involving the authenticated user' })
  listMine(@CurrentUser('id') userId: string) {
    return this.visitsService.listMine(userId);
  }

  @Get('visits/:visitId')
  @ApiOperation({ summary: 'Read participant-safe visit detail' })
  getMine(
    @CurrentUser('id') userId: string,
    @Param('visitId') visitId: string,
  ) {
    return this.visitsService.getMine(userId, visitId);
  }

  @Post('visits/:visitId/accept')
  @ApiOperation({ summary: 'Accept a visit proposal and surface overlaps' })
  accept(@CurrentUser('id') userId: string, @Param('visitId') visitId: string) {
    return this.visitsService.accept(userId, visitId);
  }

  @Post('visits/:visitId/decline')
  @ApiOperation({ summary: 'Decline a visit proposal' })
  decline(
    @CurrentUser('id') userId: string,
    @Param('visitId') visitId: string,
  ) {
    return this.visitsService.decline(userId, visitId);
  }

  @Post('visits/:visitId/replacement')
  @ApiOperation({ summary: 'Counter-propose a replacement visit window' })
  replacement(
    @CurrentUser('id') userId: string,
    @Param('visitId') visitId: string,
    @Body() dto: CreateVisitDto,
  ) {
    return this.visitsService.proposeReplacement(userId, visitId, dto);
  }

  @Post('visits/:visitId/cancel')
  @ApiOperation({ summary: 'Cancel a proposed or accepted visit' })
  cancel(@CurrentUser('id') userId: string, @Param('visitId') visitId: string) {
    return this.visitsService.cancel(userId, visitId);
  }

  @Post('visits/:visitId/outcome')
  @ApiOperation({ summary: 'Record a post-visit completed/no-show outcome' })
  outcome(
    @CurrentUser('id') userId: string,
    @Param('visitId') visitId: string,
    @Body() dto: VisitOutcomeDto,
  ) {
    return this.visitsService.recordOutcome(userId, visitId, dto.outcome);
  }

  @Get('visits/:visitId/location')
  @ApiOperation({
    summary: 'Read exact location only for an accepted, not-ended visit',
  })
  location(
    @CurrentUser('id') userId: string,
    @Param('visitId') visitId: string,
  ) {
    return this.visitsService.getExactLocation(userId, visitId);
  }
}
