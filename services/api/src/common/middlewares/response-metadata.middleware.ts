import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class ResponseMetadataMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    response.setHeader('X-API-Version', '1.0.0');

    response.on('finish', () => {
      const durationNanoseconds = process.hrtime.bigint() - startedAt;
      const durationMilliseconds = Number(durationNanoseconds) / 1_000_000;

      response.setHeader(
        'X-Response-Time',
        `${durationMilliseconds.toFixed(2)}ms`,
      );
    });

    next();
  }
}
