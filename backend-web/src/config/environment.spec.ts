import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  const validConfig = {
    NODE_ENV: 'development',
    PORT: '3001',
    API_PREFIX: 'api/v1',
    CORS_ORIGINS: 'http://localhost:3000',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'root',
    DB_PASSWORD: '',
    DB_DATABASE: 'web_freelancer',
    DB_SYNCHRONIZE: 'true',
    REDIS_URL: 'redis://localhost:6379',
    REDIS_CONNECT_TIMEOUT_MS: '5000',
    COOKIE_SECRET: 'a'.repeat(64),
    COOKIE_DOMAIN: '',
    AUTH_ACCESS_TTL_SECONDS: '900',
    AUTH_REFRESH_TTL_SECONDS: '2592000',
    MEDIA_ROOT: 'storage/media',
    MEDIA_TIMEZONE: 'Asia/Ho_Chi_Minh',
    MEDIA_MAX_VIDEO_SIZE: '1073741824',
  };

  it('normalizes and converts a valid environment', () => {
    expect(validateEnvironment(validConfig)).toMatchObject({
      PORT: 3001,
      API_PREFIX: 'api/v1',
      DB_PORT: 3306,
      DB_SYNCHRONIZE: true,
      REDIS_URL: 'redis://localhost:6379',
      REDIS_CONNECT_TIMEOUT_MS: 5000,
      AUTH_ACCESS_TTL_SECONDS: 900,
      AUTH_REFRESH_TTL_SECONDS: 2_592_000,
      MEDIA_MAX_VIDEO_SIZE: 1_073_741_824,
    });
  });

  it('removes leading and trailing slashes from API_PREFIX', () => {
    expect(
      validateEnvironment({
        ...validConfig,
        API_PREFIX: ' /api/v1/ ',
      }).API_PREFIX,
    ).toBe('api/v1');
  });

  it('normalizes multiple CORS origins', () => {
    expect(
      validateEnvironment({
        ...validConfig,
        CORS_ORIGINS: 'http://localhost:3000, https://shop.example.com ',
      }).CORS_ORIGINS,
    ).toBe('http://localhost:3000,https://shop.example.com');
  });

  it('canonicalizes and deduplicates CORS origins', () => {
    expect(
      validateEnvironment({
        ...validConfig,
        CORS_ORIGINS: 'http://LOCALHOST:3000/,http://localhost:3000',
      }).CORS_ORIGINS,
    ).toBe('http://localhost:3000');
  });

  it.each([
    'https://example.com/path',
    'https://example.com?redirect=x',
    'https://user:pass@example.com',
  ])('rejects a CORS URL that is not an origin: %s', (origin) => {
    expect(() =>
      validateEnvironment({ ...validConfig, CORS_ORIGINS: origin }),
    ).toThrow('Invalid CORS origin');
  });

  it('validates trusted IPv4 and IPv6 proxy CIDRs', () => {
    expect(
      validateEnvironment({
        ...validConfig,
        TRUSTED_PROXY_CIDRS: '10.0.0.0/8, 2001:db8::/32',
      }).TRUSTED_PROXY_CIDRS,
    ).toBe('10.0.0.0/8,2001:db8::/32');

    expect(() =>
      validateEnvironment({
        ...validConfig,
        TRUSTED_PROXY_CIDRS: '10.0.0.0/99',
      }),
    ).toThrow('trusted proxy CIDR');
  });

  it.each(['redis://localhost:6379', 'rediss://cache.example.com:6380'])(
    'accepts supported Redis URL %s',
    (url) => {
      expect(
        validateEnvironment({ ...validConfig, REDIS_URL: url }).REDIS_URL,
      ).toBe(url);
    },
  );

  it.each(['http://localhost:6379', 'localhost:6379', ''])(
    'rejects unsafe or malformed Redis URL %j',
    (url) => {
      expect(() =>
        validateEnvironment({ ...validConfig, REDIS_URL: url }),
      ).toThrow('REDIS_URL');
    },
  );

  it.each(['ftp://example.com', 'not-a-url'])(
    'rejects invalid CORS origin %s',
    (origin) => {
      expect(() =>
        validateEnvironment({
          ...validConfig,
          CORS_ORIGINS: origin,
        }),
      ).toThrow();
    },
  );

  it.each(['staging', '', 'PRODUCTION'])(
    'rejects invalid NODE_ENV %j',
    (nodeEnvironment) => {
      expect(() =>
        validateEnvironment({
          ...validConfig,
          NODE_ENV: nodeEnvironment,
        }),
      ).toThrow('NODE_ENV');
    },
  );

  it.each([
    ['PORT', '0'],
    ['PORT', 'abc'],
    ['DB_PORT', '-1'],
    ['AUTH_ACCESS_TTL_SECONDS', '59'],
    ['AUTH_REFRESH_TTL_SECONDS', '299'],
    ['MEDIA_MAX_VIDEO_SIZE', '0'],
  ])('rejects invalid numeric variable %s=%s', (key, value) => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        [key]: value,
      }),
    ).toThrow(key);
  });

  it.each(['DB_HOST', 'DB_USERNAME', 'DB_DATABASE', 'MEDIA_ROOT'])(
    'rejects missing required variable %s',
    (key) => {
      expect(() =>
        validateEnvironment({
          ...validConfig,
          [key]: '',
        }),
      ).toThrow(key);
    },
  );

  it('rejects a cookie secret shorter than 64 characters', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        COOKIE_SECRET: 'short-secret',
      }),
    ).toThrow('COOKIE_SECRET');
  });

  it('requires access sessions to expire before refresh sessions', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        AUTH_ACCESS_TTL_SECONDS: '300',
        AUTH_REFRESH_TTL_SECONDS: '300',
      }),
    ).toThrow(
      'AUTH_ACCESS_TTL_SECONDS must be less than AUTH_REFRESH_TTL_SECONDS',
    );
  });

  it.each(['1', 'yes', 'FALSE'])(
    'rejects malformed boolean value %j',
    (value) => {
      expect(() =>
        validateEnvironment({
          ...validConfig,
          DB_SYNCHRONIZE: value,
        }),
      ).toThrow('DB_SYNCHRONIZE');
    },
  );

  it('forbids schema synchronization in production', () => {
    expect(() =>
      validateEnvironment({
        ...validConfig,
        NODE_ENV: 'production',
        DB_SYNCHRONIZE: 'true',
      }),
    ).toThrow('DB_SYNCHRONIZE cannot be enabled in production');
  });

  it.each(['true', true, 'false', false, undefined])(
    'always disables Swagger in production when configured as %j',
    (swaggerEnabled) => {
      expect(
        validateEnvironment({
          ...validConfig,
          NODE_ENV: 'production',
          DB_SYNCHRONIZE: 'false',
          SWAGGER_ENABLED: swaggerEnabled,
        }).SWAGGER_ENABLED,
      ).toBe(false);
    },
  );
});
