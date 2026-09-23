import { jest } from '@jest/globals';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports application and database availability', async () => {
    const query = jest.fn().mockResolvedValue([{ result: 1 }]);
    const controller = new HealthController({
      query,
    } as unknown as DataSource);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns a controlled 503 error when the database is unavailable', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const controller = new HealthController({
      query: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as DataSource);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
