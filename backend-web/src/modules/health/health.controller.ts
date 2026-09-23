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
  async readiness() {
    await Promise.all([this.dataSource.query('SELECT 1'), this.redis.ping()]);

    return {
      status: 'ok',
      database: 'up',
      redis: 'up',
    };
  }

  @Get('live')
  @SkipThrottle()
  liveness() {
    return { status: 'ok' };
  }
}
