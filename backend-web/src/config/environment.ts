import { isIP } from 'node:net';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string;
  LOG_DIRECTORY: string;
  TRUSTED_PROXY_CIDRS: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SYNCHRONIZE: boolean;
  DB_POOL_CONNECTION_LIMIT: number;
  DB_POOL_QUEUE_LIMIT: number;
  DB_SLOW_QUERY_THRESHOLD_MS: number;

  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;

  REDIS_URL: string;
  REDIS_CONNECT_TIMEOUT_MS: number;

  REQUEST_TIMEOUT_MS: number;
  SLOW_REQUEST_THRESHOLD_MS: number;
  MAX_CONCURRENT_REQUESTS: number;
  SHUTDOWN_GRACE_MS: number;
  EVENT_LOOP_LAG_THRESHOLD_MS: number;
  SERVER_HEADERS_TIMEOUT_MS: number;
  SERVER_KEEP_ALIVE_TIMEOUT_MS: number;

  COOKIE_SECRET: string;
  COOKIE_DOMAIN: string;

  AUTH_ACCESS_TTL_SECONDS: number;
  AUTH_REFRESH_TTL_SECONDS: number;
  AUTH_SESSION_RETENTION_DAYS: number;
  BOOTSTRAP_SUPERADMIN_EMAIL?: string;
  BOOTSTRAP_SUPERADMIN_PASSWORD?: string;

  MEDIA_ROOT: string;
  MEDIA_TIMEZONE: string;
  MEDIA_MAX_IMAGE_SIZE: number;
  MEDIA_MAX_VIDEO_SIZE: number;
  SWAGGER_ENABLED: boolean;
}

function requiredString(config: Record<string, unknown>, key: string): string {
  const rawValue = config[key];

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    throw new Error(`Environment variable ${key} is required`);
  }

  const value = String(rawValue).trim();

  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

function optionalString(
  config: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === null) {
    return fallback;
  }

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    throw new Error(`Environment variable ${key} must be a string`);
  }

  return String(rawValue).trim();
}

function integer(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const value = Number(config[key] ?? fallback);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `Environment variable ${key} must be an integer between ${minimum} and ${maximum}`,
    );
  }

  return value;
}

function booleanValue(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  if (rawValue === true || rawValue === 'true') {
    return true;
  }

  if (rawValue === false || rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${key} must be true or false`);
}

function apiPrefix(config: Record<string, unknown>): string {
  const prefix = optionalString(config, 'API_PREFIX', 'api/v1').replace(
    /^\/+|\/+$/g,
    '',
  );

  if (!prefix) {
    throw new Error('Environment variable API_PREFIX cannot be empty');
  }

  return prefix;
}

function corsOrigins(config: Record<string, unknown>): string {
  const rawValue = requiredString(config, 'CORS_ORIGINS');
  const origins = rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin');
  }

  const normalizedOrigins = origins.map((origin) => {
    const url = new URL(origin);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    return url.origin;
  });

  return [...new Set(normalizedOrigins)].join(',');
}

function trustedProxyCidrs(config: Record<string, unknown>): string {
  const values = optionalString(config, 'TRUSTED_PROXY_CIDRS')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  for (const value of values) {
    const [address, prefix, extra] = value.split('/');
    const version = isIP(address);
    const maximumPrefix = version === 4 ? 32 : 128;
    const numericPrefix = prefix === undefined ? maximumPrefix : Number(prefix);

    if (
      extra !== undefined ||
      version === 0 ||
      !Number.isInteger(numericPrefix) ||
      numericPrefix < 0 ||
      numericPrefix > maximumPrefix
    ) {
      throw new Error(`Invalid trusted proxy CIDR: ${value}`);
    }
  }

  return values.join(',');
}

function redisUrl(config: Record<string, unknown>): string {
  const value = requiredString(config, 'REDIS_URL');
  const url = new URL(value);

  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }

  return value;
}

function timeZone(config: Record<string, unknown>): string {
  const value = requiredString(config, 'MEDIA_TIMEZONE');

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
  } catch {
    throw new Error('MEDIA_TIMEZONE must be a valid IANA time zone');
  }

  return value;
}

function bootstrapSuperadmin(config: Record<string, unknown>) {
  const email = optionalString(
    config,
    'BOOTSTRAP_SUPERADMIN_EMAIL',
  ).toLowerCase();
  const rawPassword = config.BOOTSTRAP_SUPERADMIN_PASSWORD;
  const password =
    typeof rawPassword === 'string'
      ? rawPassword
      : rawPassword == null
        ? ''
        : null;

  if (password === null) {
    throw new Error(
      'Environment variable BOOTSTRAP_SUPERADMIN_PASSWORD must be a string',
    );
  }

  if (!email && !password) {
    return {};
  }

  if (!email || !password) {
    throw new Error(
      'BOOTSTRAP_SUPERADMIN_EMAIL and BOOTSTRAP_SUPERADMIN_PASSWORD must be provided together',
    );
  }

  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('BOOTSTRAP_SUPERADMIN_EMAIL must be a valid email');
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error(
      'BOOTSTRAP_SUPERADMIN_PASSWORD must contain between 12 and 128 characters',
    );
  }

  return {
    BOOTSTRAP_SUPERADMIN_EMAIL: email,
    BOOTSTRAP_SUPERADMIN_PASSWORD: password,
  };
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnvironment = optionalString(
    config,
    'NODE_ENV',
    'development',
  ) as NodeEnvironment;

  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const cookieSecret = requiredString(config, 'COOKIE_SECRET');

  if (cookieSecret.length < 64) {
    throw new Error('COOKIE_SECRET must contain at least 64 characters');
  }

  const synchronize = booleanValue(
    config,
    'DB_SYNCHRONIZE',
    nodeEnvironment === 'development',
  );

  if (nodeEnvironment === 'production' && synchronize) {
    throw new Error('DB_SYNCHRONIZE cannot be enabled in production');
  }

  const accessTtlSeconds = integer(config, 'AUTH_ACCESS_TTL_SECONDS', 900, 60);
  const refreshTtlSeconds = integer(
    config,
    'AUTH_REFRESH_TTL_SECONDS',
    2_592_000,
    300,
  );

  if (accessTtlSeconds >= refreshTtlSeconds) {
    throw new Error(
      'AUTH_ACCESS_TTL_SECONDS must be less than AUTH_REFRESH_TTL_SECONDS',
    );
  }

  const bootstrapAdmin = bootstrapSuperadmin(config);

  return {
    NODE_ENV: nodeEnvironment,
    PORT: integer(config, 'PORT', 3001, 1, 65_535),
    API_PREFIX: apiPrefix(config),
    CORS_ORIGINS: corsOrigins(config),
    LOG_DIRECTORY: optionalString(config, 'LOG_DIRECTORY', 'logs'),
    TRUSTED_PROXY_CIDRS: trustedProxyCidrs(config),

    DB_HOST: requiredString(config, 'DB_HOST'),
    DB_PORT: integer(config, 'DB_PORT', 3306, 1, 65_535),
    DB_USERNAME: requiredString(config, 'DB_USERNAME'),
    DB_PASSWORD: optionalString(config, 'DB_PASSWORD'),
    DB_DATABASE: requiredString(config, 'DB_DATABASE'),
    DB_SYNCHRONIZE: synchronize,
    DB_POOL_CONNECTION_LIMIT: integer(
      config,
      'DB_POOL_CONNECTION_LIMIT',
      20,
      1,
    ),
    DB_POOL_QUEUE_LIMIT: integer(config, 'DB_POOL_QUEUE_LIMIT', 100, 0),
    DB_SLOW_QUERY_THRESHOLD_MS: integer(
      config,
      'DB_SLOW_QUERY_THRESHOLD_MS',
      1_000,
      1,
    ),

    THROTTLE_TTL_MS: integer(config, 'THROTTLE_TTL_MS', 60_000, 1_000),
    THROTTLE_LIMIT: integer(config, 'THROTTLE_LIMIT', 100, 1),

    REDIS_URL: redisUrl(config),
    REDIS_CONNECT_TIMEOUT_MS: integer(
      config,
      'REDIS_CONNECT_TIMEOUT_MS',
      5_000,
      100,
    ),

    REQUEST_TIMEOUT_MS: integer(config, 'REQUEST_TIMEOUT_MS', 30_000, 100),
    SLOW_REQUEST_THRESHOLD_MS: integer(
      config,
      'SLOW_REQUEST_THRESHOLD_MS',
      2_000,
      1,
    ),
    MAX_CONCURRENT_REQUESTS: integer(config, 'MAX_CONCURRENT_REQUESTS', 200, 1),
    SHUTDOWN_GRACE_MS: integer(config, 'SHUTDOWN_GRACE_MS', 15_000, 100),
    EVENT_LOOP_LAG_THRESHOLD_MS: integer(
      config,
      'EVENT_LOOP_LAG_THRESHOLD_MS',
      200,
      1,
    ),
    SERVER_HEADERS_TIMEOUT_MS: integer(
      config,
      'SERVER_HEADERS_TIMEOUT_MS',
      35_000,
      1_000,
    ),
    SERVER_KEEP_ALIVE_TIMEOUT_MS: integer(
      config,
      'SERVER_KEEP_ALIVE_TIMEOUT_MS',
      5_000,
      100,
    ),

    COOKIE_SECRET: cookieSecret,
    COOKIE_DOMAIN: optionalString(config, 'COOKIE_DOMAIN'),

    AUTH_ACCESS_TTL_SECONDS: accessTtlSeconds,
    AUTH_REFRESH_TTL_SECONDS: refreshTtlSeconds,
    AUTH_SESSION_RETENTION_DAYS: integer(
      config,
      'AUTH_SESSION_RETENTION_DAYS',
      30,
      1,
    ),
    ...bootstrapAdmin,

    MEDIA_ROOT: requiredString(config, 'MEDIA_ROOT'),
    MEDIA_TIMEZONE: timeZone(config),
    MEDIA_MAX_IMAGE_SIZE: integer(
      config,
      'MEDIA_MAX_IMAGE_SIZE',
      10_485_760,
      1,
    ),
    MEDIA_MAX_VIDEO_SIZE: integer(
      config,
      'MEDIA_MAX_VIDEO_SIZE',
      1_073_741_824,
      1,
    ),
    SWAGGER_ENABLED:
      nodeEnvironment === 'production'
        ? false
        : booleanValue(config, 'SWAGGER_ENABLED', true),
  };
}
