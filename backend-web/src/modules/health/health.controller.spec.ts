import { jest } from '@jest/globals';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { RedisClientType } from 'redis';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports application and database availability', async () => {
    const query = jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValue([{ result: 1 }]);
    const controller = new HealthController(
      { query } as unknown as DataSource,
      { ping: jest.fn() } as unknown as RedisClientType,
    );

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns a controlled 503 error when the database is unavailable', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const query = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValue(new Error('connection refused'));
    const controller = new HealthController(
      { query } as unknown as DataSource,
      { ping: jest.fn() } as unknown as RedisClientType,
    );

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns 503 when Redis is not ready', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const controller = new HealthController(
      { query: jest.fn(async () => [{ result: 1 }]) } as unknown as DataSource,
      {
        ping: jest.fn(async () => {
          throw new Error('redis unavailable');
        }),
      } as unknown as RedisClientType,
    );

    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
