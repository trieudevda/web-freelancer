import { jest } from '@jest/globals';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { CsrfGuard } from './csrf.guard.js';

describe('CsrfGuard', () => {
  const config = {
    getOrThrow: jest.fn(() => 'http://localhost:3000'),
  } as unknown as ConfigService;

  const createContext = (
    method: string,
    headers: Record<string, string> = {},
    cookies: Record<string, string> = {},
  ) => {
    const request = {
      method,
      protocol: 'http',
      cookies,
      get: (name: string) => {
        if (name.toLowerCase() === 'host') {
          return 'localhost:3001';
        }

        return headers[name.toLowerCase()];
      },
    } as unknown as Request;

    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  it.each(['GET', 'HEAD', 'OPTIONS'])('allows safe method %s', (method) => {
    expect(new CsrfGuard(config).canActivate(createContext(method))).toBe(true);
  });

  it('allows initial login from a configured origin without auth cookies', () => {
    const context = createContext('POST', {
      origin: 'http://localhost:3000',
    });

    expect(new CsrfGuard(config).canActivate(context)).toBe(true);
  });

  it('rejects unsafe requests from an untrusted origin', () => {
    const context = createContext('POST', {
      origin: 'https://attacker.example',
    });

    expect(() => new CsrfGuard(config).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects authenticated requests without a matching CSRF header', () => {
    const context = createContext(
      'POST',
      { origin: 'http://localhost:3000' },
      { access_token: 'access', csrf_token: 'cookie-token' },
    );

    expect(() => new CsrfGuard(config).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('allows authenticated requests with matching CSRF tokens', () => {
    const context = createContext(
      'POST',
      {
        origin: 'http://localhost:3000',
        'x-csrf-token': 'same-token',
      },
      { access_token: 'access', csrf_token: 'same-token' },
    );

    expect(new CsrfGuard(config).canActivate(context)).toBe(true);
  });
});
