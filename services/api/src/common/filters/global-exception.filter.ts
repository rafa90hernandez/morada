import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ApiErrorResponse } from '../interfaces/api-error-response.interface';

type HttpExceptionBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
};

type ParsedException = {
  code: string;
  message: string;
  details: unknown;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const parsed = this.parseExceptionResponse(exceptionResponse, status);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: parsed.code,
        message: parsed.message,
        details: parsed.details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private parseExceptionResponse(
    exceptionResponse: string | object | null,
    status: number,
  ): ParsedException {
    if (typeof exceptionResponse === 'string') {
      return {
        code: this.defaultCode(status),
        message: exceptionResponse,
        details: null,
      };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as HttpExceptionBody;

      if (Array.isArray(body.message)) {
        return {
          code: body.code ?? 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: body.message,
        };
      }

      return {
        code: body.code ?? this.defaultCode(status),
        message: body.message ?? body.error ?? this.defaultMessage(status),
        details: null,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: null,
    };
  }

  private defaultCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
    };

    return codes[status] ?? 'INTERNAL_SERVER_ERROR';
  }

  private defaultMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Invalid request.',
      401: 'Authentication required.',
      403: 'You are not allowed to perform this action.',
      404: 'Resource not found.',
      409: 'The request conflicts with the current state.',
      422: 'The request could not be processed.',
      429: 'Too many requests.',
    };

    return messages[status] ?? 'An unexpected error occurred.';
  }
}
