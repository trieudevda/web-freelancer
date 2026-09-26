import { RedisToken } from '@nestjs-redis/client';
import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { RedisClientType } from 'redis';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(RedisToken())
    private readonly redis: RedisClientType,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check application and database health' })
  @ApiOkResponse({
    description: 'Application and database are available',
  })
  @ApiServiceUnavailableResponse({
    description: 'Database is unavailable',
  })
  async check() {
    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
  @Get('ready')
  @ApiOperation({ summary: 'Check database and Redis readiness' })
  @ApiOkResponse({ description: 'Application dependencies are ready' })
  @ApiServiceUnavailableResponse({ description: 'A dependency is unavailable' })
  async readiness() {
    try {
      await Promise.all([this.dataSource.query('SELECT 1'), this.redis.ping()]);
    } catch (error) {
      this.logger.error(
        'Readiness check failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Application is not ready');
    }

    return {
      status: 'ok',
      database: 'up',
      redis: 'up',
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Check process liveness' })
  @SkipThrottle()
  liveness() {
    return { status: 'ok' };
  }
}
