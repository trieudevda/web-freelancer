import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE } from './auth-cookie.constants';

@Injectable()
export class AuthCookieService {
  private readonly production: boolean;

  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  private readonly domain: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.production = config.get<string>('NODE_ENV') === 'production';

    this.accessTtlMs =
      Number(config.get('AUTH_ACCESS_TTL_SECONDS', 15 * 60)) * 1000;

    this.refreshTtlMs =
      Number(config.get('AUTH_REFRESH_TTL_SECONDS', 30 * 24 * 60 * 60)) * 1000;

    this.domain = config.get<string>('COOKIE_DOMAIN') || undefined;
  }

  setDeviceId(response: Response, deviceId: string) {
    response.cookie(AUTH_COOKIE.DEVICE_ID, deviceId, {
      ...this.baseOptions(),

      signed: true,

      maxAge: 365 * 24 * 60 * 60 * 1000,

      path: '/auth',
    });
  }

  setAuthTokens(response: Response, accessToken: string, refreshToken: string) {
    response.cookie(AUTH_COOKIE.ACCESS_TOKEN, accessToken, {
      ...this.baseOptions(),

      maxAge: this.accessTtlMs,

      path: '/api',
    });

    response.cookie(AUTH_COOKIE.REFRESH_TOKEN, refreshToken, {
      ...this.baseOptions(),

      maxAge: this.refreshTtlMs,

      path: '/auth/refresh',
    });
  }

  clearAuthTokens(response: Response) {
    response.clearCookie(AUTH_COOKIE.ACCESS_TOKEN, {
      ...this.baseOptions(),
      path: '/',
    });

    response.clearCookie(AUTH_COOKIE.REFRESH_TOKEN, {
      ...this.baseOptions(),
      path: '/auth',
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
