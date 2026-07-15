import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';

import type { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const requestId = randomUUID();

    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    next();
  }
}
