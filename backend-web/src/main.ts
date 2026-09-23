import { type INestApplication, type LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';
import type { RequestLifecycleTracker } from './common/runtime/request-lifecycle.middleware.js';
import { StructuredLogger } from './common/logging/structured-logger.js';

const production = process.env.NODE_ENV === 'production';
const logLevels: LogLevel[] = production
  ? ['fatal', 'error', 'warn', 'log']
  : ['fatal', 'error', 'warn', 'log', 'debug'];
const logger = new StructuredLogger(
  process.env.LOG_DIRECTORY?.trim() || 'logs',
  logLevels,
);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });
  const requestLifecycle = configureApplication(app);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  const server = await app.listen(port);

  server.headersTimeout = config.getOrThrow<number>(
    'SERVER_HEADERS_TIMEOUT_MS',
  );
  server.requestTimeout = config.getOrThrow<number>('REQUEST_TIMEOUT_MS');
  server.keepAliveTimeout = config.getOrThrow<number>(
    'SERVER_KEEP_ALIVE_TIMEOUT_MS',
  );

  installShutdownHandlers(app, server, requestLifecycle, config);
  logger.log({ event: 'application_started', port });
}

function installShutdownHandlers(
  app: INestApplication,
  server: Server,
  requestLifecycle: RequestLifecycleTracker,
  config: ConfigService,
): void {
  let shutdownPromise: Promise<void> | undefined;
  const graceMs = config.getOrThrow<number>('SHUTDOWN_GRACE_MS');

  const shutdown = (reason: string, failure?: unknown) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = performShutdown(
      app,
      server,
      requestLifecycle,
      graceMs,
      reason,
      failure,
    );
    return shutdownPromise;
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once(
    'uncaughtException',
    (error) => void shutdown('uncaughtException', error),
  );
  process.once(
    'unhandledRejection',
    (error) => void shutdown('unhandledRejection', error),
  );
}

async function performShutdown(
  app: INestApplication,
  server: Server,
  requestLifecycle: RequestLifecycleTracker,
  graceMs: number,
  reason: string,
  failure?: unknown,
): Promise<void> {
  const failed = failure !== undefined;
  logger[failed ? 'fatal' : 'warn']({
    event: 'application_shutdown',
    reason,
    error: serializeError(failure),
  });
  requestLifecycle.beginShutdown();
  server.close();

  const drained = await requestLifecycle.waitForDrain(graceMs);

  if (!drained) {
    logger.error({
      event: 'shutdown_grace_exceeded',
      graceMs,
      activeRequests: requestLifecycle.getActiveRequests(),
    });
    server.closeAllConnections();
  }

  await app.close();
  logger.log({ event: 'application_stopped', reason });
  await logger.close();
  process.exitCode = failed ? 1 : 0;
}

function serializeError(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error === undefined
      ? undefined
      : { value: safelySerialize(error) };
}

function safelySerialize(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'Unknown failure';
  } catch {
    return 'Unserializable failure';
  }
}

void bootstrap().catch((error: unknown) => {
  logger.fatal({
    event: 'application_start_failed',
    error: serializeError(error),
  });
  void logger.close();
  process.exitCode = 1;
});
