import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { finalize, type Observable } from 'rxjs';

@Injectable()
export class ResponseMetadataInterceptor<T> implements NestInterceptor<T, T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    response.setHeader('X-API-Version', '1.0.0');

    return next.handle().pipe(
      finalize(() => {
        const durationNanoseconds = process.hrtime.bigint() - startedAt;
        const durationMilliseconds = Number(durationNanoseconds) / 1_000_000;

        if (!response.headersSent) {
          response.setHeader(
            'X-Response-Time',
            `${durationMilliseconds.toFixed(2)}ms`,
          );
        }
      }),
    );
  }
}
