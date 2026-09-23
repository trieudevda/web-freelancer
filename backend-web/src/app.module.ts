import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './modules/user/user.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './modules/health/health.module.js';
import { ApiResponseInterceptor } from './common/http/api-response.interceptor.js';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/http/api-exception.filter.js';
import { CsrfGuard } from './modules/auth/csrf.guard.js';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import {
  RedisThrottlerStorage,
  ThrottlerAlgorithm,
} from '@nestjs-redis/throttler-storage';
import type { RedisClientType } from 'redis';
import { RequestTimeoutInterceptor } from './common/runtime/request-timeout.interceptor.js';
import { EventLoopMonitorService } from './common/runtime/event-loop-monitor.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.getOrThrow<number>('DB_PORT'),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_DATABASE'),

        autoLoadEntities: true,
        synchronize: config.getOrThrow<boolean>('DB_SYNCHRONIZE'),
        logging: ['error', 'warn'],
        maxQueryExecutionTime: config.getOrThrow<number>(
          'DB_SLOW_QUERY_THRESHOLD_MS',
        ),
        extra: {
          connectionLimit: config.getOrThrow<number>(
            'DB_POOL_CONNECTION_LIMIT',
          ),
          queueLimit: config.getOrThrow<number>('DB_POOL_QUEUE_LIMIT'),
          waitForConnections: true,
        },
      }),
    }),
    RedisModule.forRootAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        options: {
          url: config.getOrThrow<string>('REDIS_URL'),
          socket: {
            connectTimeout: config.getOrThrow<number>(
              'REDIS_CONNECT_TIMEOUT_MS',
            ),
            reconnectStrategy: (retries: number) =>
              retries >= 3 ? false : Math.min(retries * 100, 500),
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, RedisToken()],
      useFactory: (config: ConfigService, redis: RedisClientType) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.getOrThrow<number>('THROTTLE_TTL_MS'),
            limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
          },
        ],
        storage: new RedisThrottlerStorage(
          redis,
          ThrottlerAlgorithm.SlidingWindowCounter,
        ),
      }),
    }),
    ScheduleModule.forRoot(),
    UserModule,
    MediaModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EventLoopMonitorService,
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
  ],
})
export class AppModule {}
