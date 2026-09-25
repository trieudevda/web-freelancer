import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AUTH_COOKIE } from './auth-cookie.constants.js';

@Injectable()
export class AuthCookieService {
  private readonly production: boolean;
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;
  private readonly domain: string | undefined;

  private readonly apiPath: string;
  private readonly authPath: string;
  private readonly refreshPath: string;

  constructor(private readonly config: ConfigService) {
    this.production = config.getOrThrow<string>('NODE_ENV') === 'production';

    this.accessTtlMs =
      config.getOrThrow<number>('AUTH_ACCESS_TTL_SECONDS') * 1000;

    this.refreshTtlMs =
      config.getOrThrow<number>('AUTH_REFRESH_TTL_SECONDS') * 1000;

    this.domain = config.getOrThrow<string>('COOKIE_DOMAIN') || undefined;

    const prefix = config
      .getOrThrow<string>('API_PREFIX')
      .replace(/^\/+|\/+$/g, '');

    this.apiPath = `/${prefix}`;
    this.authPath = `${this.apiPath}/auth`;
    this.refreshPath = `${this.authPath}/refresh`;
  }

  setDeviceId(response: Response, deviceId: string) {
    response.cookie(AUTH_COOKIE.DEVICE_ID, deviceId, {
      ...this.baseOptions(),
      signed: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: this.authPath,
    });
  }

  setAuthTokens(
    response: Response,
    accessToken: string,
    refreshToken: string,
    expires?: { accessExpiresAt: Date; refreshExpiresAt: Date },
  ) {
    const accessMaxAge = expires
      ? Math.max(0, expires.accessExpiresAt.getTime() - Date.now())
      : this.accessTtlMs;
    const refreshMaxAge = expires
      ? Math.max(0, expires.refreshExpiresAt.getTime() - Date.now())
      : this.refreshTtlMs;

    response.cookie(AUTH_COOKIE.ACCESS_TOKEN, accessToken, {
      ...this.baseOptions(),
      maxAge: accessMaxAge,
      path: this.apiPath,
    });

    response.cookie(AUTH_COOKIE.REFRESH_TOKEN, refreshToken, {
      ...this.baseOptions(),
      maxAge: refreshMaxAge,
      path: this.refreshPath,
    });

    response.cookie(
      AUTH_COOKIE.CSRF_TOKEN,
      randomBytes(32).toString('base64url'),
      {
        ...this.baseOptions(),
        httpOnly: false,
        maxAge: refreshMaxAge,
        path: '/',
      },
    );
  }

  clearAuthTokens(response: Response) {
    response.clearCookie(AUTH_COOKIE.ACCESS_TOKEN, {
      ...this.baseOptions(),
      path: this.apiPath,
    });

    response.clearCookie(AUTH_COOKIE.REFRESH_TOKEN, {
      ...this.baseOptions(),
      path: this.refreshPath,
    });

    response.clearCookie(AUTH_COOKIE.CSRF_TOKEN, {
      ...this.baseOptions(),
      httpOnly: false,
      path: '/',
    });
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.production,
      sameSite: 'strict',
      domain: this.domain,
    };
  }
}
