import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AUTH_COOKIE } from './auth-cookie.constants.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(config: ConfigService) {
    this.allowedOrigins = new Set(
      config
        .getOrThrow<string>('CORS_ORIGINS')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    this.assertTrustedOrigin(request);

    const accessToken = this.readCookie(request, AUTH_COOKIE.ACCESS_TOKEN);
    const refreshToken = this.readCookie(request, AUTH_COOKIE.REFRESH_TOKEN);

    if (!accessToken && !refreshToken) {
      return true;
    }

    const cookieToken = this.readCookie(request, AUTH_COOKIE.CSRF_TOKEN);
    const headerToken = request.get('x-csrf-token');

    if (
      !cookieToken ||
      !headerToken ||
      !this.tokensMatch(cookieToken, headerToken)
    ) {
      throw new ForbiddenException('CSRF token không hợp lệ');
    }

    return true;
  }

  private assertTrustedOrigin(request: Request): void {
    const origin = this.getRequestOrigin(request);
    const currentOrigin = `${request.protocol}://${request.get('host') ?? ''}`;

    if (
      !origin ||
      (!this.allowedOrigins.has(origin) && origin !== currentOrigin)
    ) {
      throw new ForbiddenException('Nguồn request không được phép');
    }
  }

  private getRequestOrigin(request: Request): string | null {
    const origin = request.get('origin');

    if (origin) {
      return origin;
    }

    const referer = request.get('referer');

    if (!referer) {
      return null;
    }

    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  private readCookie(request: Request, name: string): string | undefined {
    const cookies: unknown = request.cookies;

    if (!cookies || typeof cookies !== 'object') {
      return undefined;
    }

    const value = (cookies as Record<string, unknown>)[name];

    return typeof value === 'string' ? value : undefined;
  }

  private tokensMatch(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
