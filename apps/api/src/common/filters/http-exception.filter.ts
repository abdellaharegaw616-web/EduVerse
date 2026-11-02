import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { ApiErrorResponse } from '@eduverse/shared-types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'Internal Server Error';
    let message: string | string[] = 'An unexpected internal server error occurred.';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorName = exception.name;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;
        message = (resObj['message'] as string | string[]) || exception.message;
        errorName = (resObj['error'] as string) || exception.name;
      }
    } else if (exception instanceof Error) {
      // In development, log internal error details without leaking to client
      this.logger.error(`Unhandled Exception at ${request.url}: ${exception.message}`, exception.stack);
    }

    const errorPayload: ApiErrorResponse = {
      statusCode,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(`[${request.method}] ${request.url} - ${statusCode} - ${JSON.stringify(message)}`);
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${statusCode} - ${JSON.stringify(message)}`);
    }

    response.status(statusCode).json(errorPayload);
  }
}

