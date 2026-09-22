import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ParsedSessionToken {
  sessionId: string;
  secret: string;
}

export interface CreatedSessionToken {
  token: string;
  hash: string;
}

export function createSessionToken(
  sessionId: string,
  secretBytes = 32,
): CreatedSessionToken {
  const secret = randomBytes(secretBytes).toString('base64url');

  return {
    token: `${sessionId}.${secret}`,
    hash: hashTokenSecret(secret),
  };
}

export function parseSessionToken(token: string): ParsedSessionToken | null {
  const separator = token.indexOf('.');

  if (separator <= 0 || separator === token.length - 1) {
    return null;
  }

  const sessionId = token.slice(0, separator);
  const secret = token.slice(separator + 1);

  if (!SESSION_ID_PATTERN.test(sessionId) || secret.includes('.')) {
    return null;
  }

  return {
    sessionId,
    secret,
  };
}

export function hashTokenSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function tokenHashMatches(
  secret: string,
  expectedHash: string,
): boolean {
  if (!expectedHash) {
    return false;
  }

  const actualBuffer = Buffer.from(hashTokenSecret(secret), 'hex');

  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
