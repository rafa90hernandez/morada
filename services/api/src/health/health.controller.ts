import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Return process liveness without dependency checks',
  })
  @ApiOkResponse({ description: 'Application process is alive.' })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @HttpCode(200)
  @ApiOperation({ summary: 'Return minimal critical-dependency readiness' })
  @ApiOkResponse({ description: 'Critical dependencies are ready.' })
  @ApiServiceUnavailableResponse({
    description: 'A critical dependency is unavailable.',
  })
  async ready(@Res({ passthrough: true }) response: Response) {
    const result = await this.healthService.ready();

    if (result.status !== 'ready') {
      response.status(503);
    }

    response.setHeader('Cache-Control', 'no-store');
    return result;
  }
}
