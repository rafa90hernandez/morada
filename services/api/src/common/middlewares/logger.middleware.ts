import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';

import type { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const durationNanoseconds = process.hrtime.bigint() - startedAt;
      const durationMilliseconds = Number(durationNanoseconds) / 1_000_000;

      const logData = {
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Number(durationMilliseconds.toFixed(2)),
        ip: request.ip,
        userAgent: request.get('user-agent') ?? null,
      };

      this.logger.log(JSON.stringify(logData));
    });

    next();
  }
}
