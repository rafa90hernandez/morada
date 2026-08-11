import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getLiveness();
  }

  @Get('health/live')
  getLiveness() {
    return this.appService.getLiveness();
  }

  @Get('ready')
  getReady() {
    return this.appService.getReadiness();
  }

  @Get('health/ready')
  getReadiness() {
    return this.appService.getReadiness();
  }
}
