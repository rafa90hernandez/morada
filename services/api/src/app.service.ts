import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getHealth() {
    await this.database.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'morada-api',
      version: '1.0.0',
      environment: this.configService.get<string>('NODE_ENV') ?? 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'connected',
    };
  }
}
