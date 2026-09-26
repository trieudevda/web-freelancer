import type { LoggerService, LogLevel } from '@nestjs/common';
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { resolve } from 'node:path';

const SENSITIVE_KEY =
  /password|token|cookie|authorization|secret|csrf|set-cookie/i;

export class StructuredLogger implements LoggerService {
  private stream: WriteStream | undefined;
  private streamDate = '';
  private readonly enabledLevels: Set<LogLevel>;

  constructor(
    private readonly logDirectory: string,
    logLevels: LogLevel[],
  ) {
    this.enabledLevels = new Set(logLevels);
    mkdirSync(resolve(logDirectory), { recursive: true });
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  setLogLevels(levels: LogLevel[]): void {
    this.enabledLevels.clear();
    levels.forEach((level) => this.enabledLevels.add(level));
  }

  async close(): Promise<void> {
    const stream = this.stream;
    this.stream = undefined;

    if (!stream) {
      return;
    }

    await new Promise<void>((resolveClose) => stream.end(resolveClose));
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    if (!this.enabledLevels.has(level)) {
      return;
    }

    const base = {
      timestamp: new Date().toISOString(),
      level,
      pid: process.pid,
    };
    const normalizedMessage = normalizeValue(message);
    const entry =
      normalizedMessage && typeof normalizedMessage === 'object'
        ? {
            ...base,
            ...normalizedMessage,
            ...(optionalParams.length
              ? { details: normalizeValue(optionalParams) }
              : {}),
          }
        : {
            ...base,
            message: normalizedMessage,
            ...(optionalParams.length
              ? { details: normalizeValue(optionalParams) }
              : {}),
          };
    const line = `${JSON.stringify(entry)}\n`;

    (level === 'error' || level === 'fatal'
      ? process.stderr
      : process.stdout
    ).write(line);
    this.getStream().write(line);
  }

  private getStream(): WriteStream {
    const date = new Date().toISOString().slice(0, 10);

    if (this.stream && this.streamDate === date) {
      return this.stream;
    }

    this.stream?.end();
    this.streamDate = date;
    this.stream = createWriteStream(
      resolve(this.logDirectory, `application-${date}.log`),
      { flags: 'a', encoding: 'utf8' },
    );
    this.stream.on('error', (error) => {
      process.stderr.write(
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          event: 'log_file_write_failed',
          error: error.message,
        })}\n`,
      );
    });
    return this.stream;
  }
}

export function normalizeValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value instanceof Error) {
    const normalized: Record<string, unknown> = {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };

    for (const key of [
      'code',
      'errno',
      'syscall',
      'address',
      'port',
    ] as const) {
      if (key in value) {
        normalized[key] = normalizeValue(
          (value as unknown as Record<string, unknown>)[key],
          seen,
        );
      }
    }

    if ('cause' in value && value.cause !== undefined) {
      normalized.cause = normalizeValue(value.cause, seen);
    }

    if (value instanceof AggregateError) {
      normalized.errors = normalizeValue(value.errors, seen);
    }

    return normalized;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, seen));
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);
  const normalized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    normalized[key] = SENSITIVE_KEY.test(key)
      ? '[REDACTED]'
      : normalizeValue(nestedValue, seen);
  }

  return normalized;
}

function redactString(value: string): string {
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(access_token|refresh_token|csrf_token|password|secret)=([^\s,;]+)/gi,
      '$1=[REDACTED]',
    )
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^:\s/]+:)[^@\s/]+@/gi, '$1[REDACTED]@');
}
