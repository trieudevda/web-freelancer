import { jest } from '@jest/globals';
import {
  type CallHandler,
  type ExecutionContext,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { firstValueFrom, NEVER, of } from 'rxjs';
import { RequestTimeoutInterceptor } from './request-timeout.interceptor.js';

describe('RequestTimeoutInterceptor', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('returns a fast handler result unchanged', async () => {
    const interceptor = createInterceptor(100);
    const result = await firstValueFrom(
      interceptor.intercept(createContext(), {
        handle: () => of({ ok: true }),
      } as CallHandler),
    );

    expect(result).toEqual({ ok: true });
  });

  it('converts a stalled handler into RequestTimeoutException', async () => {
    const interceptor = createInterceptor(20);

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext(), {
          handle: () => NEVER,
        } as CallHandler),
      ),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });
});

function createInterceptor(timeoutMs: number): RequestTimeoutInterceptor {
  return new RequestTimeoutInterceptor({
    get: jest.fn(() => timeoutMs),
  } as unknown as ConfigService);
}

function createContext(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', path: '/slow' }),
      getResponse: () => ({ locals: { requestId: 'request-123' } }),
    }),
  } as unknown as ExecutionContext;
}
