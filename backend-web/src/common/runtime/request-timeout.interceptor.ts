import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  RequestTimeoutException,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { catchError, type Observable, throwError, timeout } from 'rxjs';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestTimeoutInterceptor.name);
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.timeoutMs = config.get<number>('REQUEST_TIMEOUT_MS', 30_000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // A Promise-backed database mutation cannot be cancelled by RxJS timeout.
    // Returning 408 while it continues could make a client retry a write that
    // later commits, so only time out safe/idempotent reads here.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((error: unknown) => {
        if (error instanceof Error && error.name === 'TimeoutError') {
          this.logger.error({
            event: 'request_timeout',
            requestId: this.getRequestId(response),
            method: request.method,
            path: request.path,
            timeoutMs: this.timeoutMs,
          });
          return throwError(
            () => new RequestTimeoutException('Request processing timed out'),
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private getRequestId(response: Response): string | undefined {
    const locals: unknown = response.locals;

    if (!locals || typeof locals !== 'object') {
      return undefined;
    }

    const requestId = (locals as Record<string, unknown>).requestId;
    return typeof requestId === 'string' ? requestId : undefined;
  }
}
