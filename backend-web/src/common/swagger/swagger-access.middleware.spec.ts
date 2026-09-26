import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import type { UserRole } from '../../config/constants/user/user-role.constants.js';
import type { SessionAuthService } from '../../modules/auth/session-auth.service.js';
import {
  createSwaggerAccessMiddleware,
  isSwaggerRequest,
} from './swagger-access.middleware.js';

describe('Swagger access middleware', () => {
  it.each([
    '/api/v1/docs',
    '/api/v1/docs/',
    '/api/v1/docs/swagger-ui.css',
    '/api/v1/docs-json',
    '/api/v1/docs-yaml',
  ])('recognizes protected Swagger path %s', (path) => {
    expect(isSwaggerRequest(path, '/api/v1/docs')).toBe(true);
  });

  it.each(['/api/v1/health', '/api/v1/document', '/docs'])(
    'does not intercept unrelated path %s',
    (path) => {
      expect(isSwaggerRequest(path, '/api/v1/docs')).toBe(false);
    },
  );

  it('passes unrelated requests without reading the session', async () => {
    const { middleware, next, validate } = createFixture('/api/v1/health');

    await middleware();

    expect(next).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
  });

  it('returns 401 when the access cookie is absent', async () => {
    const { middleware, response, next } = createFixture('/api/v1/docs');

    await middleware();

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ statusCode: 401 }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it.each([USER_ROLE.USER, USER_ROLE.EDITOR, USER_ROLE.SALES])(
    'returns 403 for authenticated role %s',
    async (role) => {
      const { middleware, response, next } = createFixture(
        '/api/v1/docs',
        'valid-token',
        role,
      );

      await middleware();

      expect(response.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it.each([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN])(
    'allows privileged role %s and disables caching',
    async (role) => {
      const { middleware, response, next } = createFixture(
        '/api/v1/docs-json?format=openapi',
        'valid-token',
        role,
      );

      await middleware();

      expect(response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store',
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(response.status).not.toHaveBeenCalled();
    },
  );

  it('maps expired or invalid sessions to 401 without leaking details', async () => {
    const { middleware, response, next, validate } = createFixture(
      '/api/v1/docs',
      'expired-token',
    );
    validate.mockRejectedValueOnce(new Error('database and token detail'));

    await middleware();

    expect(response.status).toHaveBeenCalledWith(401);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'database and token detail',
    );
    expect(next).not.toHaveBeenCalled();
  });
});

function createFixture(
  originalUrl: string,
  token?: string,
  role: UserRole = USER_ROLE.ADMIN,
) {
  const validate = jest.fn(async () => ({
    userId: 1,
    sessionId: 'session-id',
    authVersion: 1,
    role,
  }));
  const status = jest.fn();
  const json = jest.fn();
  const setHeader = jest.fn();
  const response = { status, json, setHeader } as unknown as Response;
  status.mockReturnValue(response);
  const next = jest.fn() as NextFunction;
  const request = {
    originalUrl,
    cookies: token ? { access_token: token } : {},
  } as Request;
  const sessionAuthService = {
    validateAccessToken: validate,
  } as unknown as SessionAuthService;
  const handler = createSwaggerAccessMiddleware(
    sessionAuthService,
    '/api/v1/docs',
  );

  return {
    middleware: () => handler(request, response, next),
    response: { status, json, setHeader },
    next,
    validate,
  };
}
