import { normalizeValue } from './structured-logger.js';

describe('structured logger redaction', () => {
  it('redacts secrets recursively without mutating safe fields', () => {
    expect(
      normalizeValue({
        event: 'login_failed',
        userId: 42,
        password: 'plain-password',
        headers: {
          authorization: 'Bearer private-token',
          cookie: 'access_token=private',
          accept: 'application/json',
        },
      }),
    ).toEqual({
      event: 'login_failed',
      userId: 42,
      password: '[REDACTED]',
      headers: {
        authorization: '[REDACTED]',
        cookie: '[REDACTED]',
        accept: 'application/json',
      },
    });
  });

  it('handles Error and circular values safely', () => {
    const value: Record<string, unknown> = { error: new Error('failure') };
    value.self = value;

    expect(normalizeValue(value)).toMatchObject({
      error: { name: 'Error', message: 'failure' },
      self: '[Circular]',
    });
  });

  it('redacts credentials embedded inside log strings', () => {
    expect(
      normalizeValue(
        'Authorization: Bearer abc.def access_token=secret redis://user:password@localhost',
      ),
    ).toBe(
      'Authorization: Bearer [REDACTED] access_token=[REDACTED] redis://user:[REDACTED]@localhost',
    );
  });
});
