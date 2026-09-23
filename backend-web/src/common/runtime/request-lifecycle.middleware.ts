import { HttpStatus, Logger } from '@nestjs/common';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;

export interface RequestLifecycleOptions {
  maxConcurrentRequests: number;
  slowRequestThresholdMs: number;
}

export class RequestLifecycleTracker {
  private readonly logger = new Logger('HTTP');
  private activeRequests = 0;
  private shuttingDown = false;

  constructor(private readonly options: RequestLifecycleOptions) {}

  middleware(): RequestHandler {
    return (request: Request, response: Response, next: NextFunction) => {
      const requestId = this.getRequestId(request);
      response.setHeader('x-request-id', requestId);
      response.locals.requestId = requestId;

      if (
        this.shuttingDown ||
        this.activeRequests >= this.options.maxConcurrentRequests
      ) {
        response.setHeader('Retry-After', '1');
        response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          success: false,
          error: {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            code: 'SERVER_BUSY',
            message: 'Server is temporarily busy',
          },
        });
        this.logger.warn({
          event: this.shuttingDown
            ? 'request_rejected_shutdown'
            : 'request_rejected_capacity',
          requestId,
          method: request.method,
          path: request.path,
          activeRequests: this.activeRequests,
        });
        return;
      }

      this.activeRequests += 1;
      const startedAt = performance.now();
      let finalized = false;

      const finalize = (aborted: boolean) => {
        if (finalized) {
          return;
        }

        finalized = true;
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        const durationMs = Math.round(performance.now() - startedAt);
        const event = {
          event: aborted ? 'request_aborted' : 'request_completed',
          requestId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs,
          activeRequests: this.activeRequests,
        };

        const badRequestStatus: number = HttpStatus.BAD_REQUEST;

        if (
          aborted ||
          response.statusCode >= badRequestStatus ||
          durationMs >= this.options.slowRequestThresholdMs
        ) {
          this.logger.warn({
            ...event,
            slow: durationMs >= this.options.slowRequestThresholdMs,
            blocked: [401, 403, 429].includes(response.statusCode),
          });
        } else {
          this.logger.debug(event);
        }
      };

      response.once('finish', () => finalize(false));
      response.once('close', () => finalize(!response.writableEnded));
      next();
    };
  }

  beginShutdown(): void {
    this.shuttingDown = true;
    this.logger.warn({
      event: 'shutdown_started',
      activeRequests: this.activeRequests,
    });
  }

  async waitForDrain(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (this.activeRequests > 0 && Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }

    return this.activeRequests === 0;
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }

  private getRequestId(request: Request): string {
    const supplied = request.get('x-request-id');

    return supplied && REQUEST_ID_PATTERN.test(supplied)
      ? supplied
      : randomUUID();
  }
}
