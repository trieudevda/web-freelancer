import type { Request } from 'express';

export function readRequestCookie(
  request: Request,
  name: string,
  signed = false,
): string | undefined {
  const cookies: unknown = signed ? request.signedCookies : request.cookies;

  if (!cookies || typeof cookies !== 'object') {
    return undefined;
  }

  const value = (cookies as Record<string, unknown>)[name];

  return typeof value === 'string' ? value : undefined;
}
