import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

interface HttpExceptionBody {
  code?: unknown;
  error?: unknown;
  message?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  private readonly production: boolean;

  constructor(@Optional() config?: ConfigService) {
    this.production = config?.get<string>('NODE_ENV') === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const normalized = this.production
      ? this.normalizeProductionException(status)
      : this.normalizeException(status, exceptionBody);
    const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= internalServerErrorStatus) {
      this.logger.error({
        event: 'http_exception',
        requestId: this.getRequestId(response),
        method: request.method,
        path: request.path,
        statusCode: status,
        error:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : { value: String(exception) },
      });
    }

    const payload = {
      success: false,
      error: normalized,
      ...(this.production
        ? {}
        : {
            timestamp: new Date().toISOString(),
            path: request.originalUrl,
          }),
    };

    response.status(status).json(payload);
  }

  private normalizeProductionException(status: number) {
    const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    const statusName = HttpStatus[status];
    const publicMessage = statusName
      ? statusName
          .toLowerCase()
          .replaceAll('_', ' ')
          .replace(/\b\w/g, (character) => character.toUpperCase())
      : 'Request failed';

    return {
      statusCode: status,
      code: `HTTP_${status}`,
      message:
        status >= internalServerErrorStatus
          ? 'Internal server error'
          : publicMessage,
    };
  }

  private getRequestId(response: Response): string | undefined {
    const locals: unknown = response.locals;

    if (!locals || typeof locals !== 'object') {
      return undefined;
    }

    const requestId = (locals as Record<string, unknown>).requestId;
    return typeof requestId === 'string' ? requestId : undefined;
  }

  private normalizeException(
    status: number,
    body: string | object | undefined,
  ) {
    const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;

    if (typeof body === 'string') {
      return {
        statusCode: status,
        code: `HTTP_${status}`,
        message: body,
      };
    }

    if (body && typeof body === 'object') {
      const value = body as HttpExceptionBody;
      const messages = Array.isArray(value.message)
        ? value.message.filter(
            (message): message is string => typeof message === 'string',
          )
        : undefined;

      return {
        statusCode: status,
        code: typeof value.code === 'string' ? value.code : `HTTP_${status}`,
        message:
          messages !== undefined
            ? 'Validation failed'
            : typeof value.message === 'string'
              ? value.message
              : (HttpStatus[status] ?? 'Request failed'),
        ...(messages ? { details: messages } : {}),
      };
    }

    return {
      statusCode: status,
      code: `HTTP_${status}`,
      message:
        status === internalServerErrorStatus
          ? 'Internal server error'
          : (HttpStatus[status] ?? 'Request failed'),
    };
  }
}
