import { jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AUTH_COOKIE } from './auth-cookie.constants.js';
import { AuthCookieService } from './auth-cookie.service.js';

describe('AuthCookieService', () => {
  const createConfig = (production = false) => {
    const values: Record<string, string | number> = {
      NODE_ENV: production ? 'production' : 'development',
      AUTH_ACCESS_TTL_SECONDS: 900,
      AUTH_REFRESH_TTL_SECONDS: 2_592_000,
      COOKIE_DOMAIN: '',
      API_PREFIX: 'api/v1',
    };

    return {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  };

  const createResponse = () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();

    return {
      response: { cookie, clearCookie } as unknown as Response,
      cookie,
      clearCookie,
    };
  };

  it('sets access and refresh cookies with scoped paths', () => {
    const service = new AuthCookieService(createConfig());
    const { response, cookie } = createResponse();

    service.setAuthTokens(response, 'access-value', 'refresh-value');

    expect(cookie).toHaveBeenNthCalledWith(
      1,
      AUTH_COOKIE.ACCESS_TOKEN,
      'access-value',
      expect.objectContaining({
        path: '/api/v1',
        maxAge: 900_000,
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      }),
    );
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      AUTH_COOKIE.REFRESH_TOKEN,
      'refresh-value',
      expect.objectContaining({
        path: '/api/v1/auth/refresh',
        maxAge: 2_592_000_000,
      }),
    );
  });

  it('clears cookies with exactly the same paths used when setting them', () => {
    const service = new AuthCookieService(createConfig());
    const { response, clearCookie } = createResponse();

    service.clearAuthTokens(response);

    expect(clearCookie).toHaveBeenNthCalledWith(
      1,
      AUTH_COOKIE.ACCESS_TOKEN,
      expect.objectContaining({ path: '/api/v1' }),
    );
    expect(clearCookie).toHaveBeenNthCalledWith(
      2,
      AUTH_COOKIE.REFRESH_TOKEN,
      expect.objectContaining({ path: '/api/v1/auth/refresh' }),
    );
  });

  it('scopes the signed device cookie to authentication endpoints', () => {
    const service = new AuthCookieService(createConfig());
    const { response, cookie } = createResponse();

    service.setDeviceId(response, 'device-id');

    expect(cookie).toHaveBeenCalledWith(
      AUTH_COOKIE.DEVICE_ID,
      'device-id',
      expect.objectContaining({
        path: '/api/v1/auth',
        signed: true,
      }),
    );
  });

  it('sets Secure cookies in production', () => {
    const service = new AuthCookieService(createConfig(true));
    const { response, cookie } = createResponse();

    service.setAuthTokens(response, 'access-value', 'refresh-value');

    expect(cookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });

  it('sets a readable CSRF cookie and clears it with the same path', () => {
    const service = new AuthCookieService(createConfig());
    const { response, cookie, clearCookie } = createResponse();

    service.setAuthTokens(response, 'access-value', 'refresh-value');
    service.clearAuthTokens(response);

    expect(cookie).toHaveBeenCalledWith(
      AUTH_COOKIE.CSRF_TOKEN,
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        path: '/',
      }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE.CSRF_TOKEN,
      expect.objectContaining({
        httpOnly: false,
        path: '/',
      }),
    );
  });
});
