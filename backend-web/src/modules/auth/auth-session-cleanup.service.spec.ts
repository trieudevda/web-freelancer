import { jest as runtimeJest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { AuthSessionCleanupService } from './auth-session-cleanup.service.js';
import type { AuthSession } from './entities/auth-session.entity.js';

Object.assign(globalThis, { jest: runtimeJest });

describe('AuthSessionCleanupService', () => {
  const getMany = jest.fn();
  const query = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany,
  };
  const createQueryBuilder = jest.fn().mockReturnValue(query);
  const deleteSessions = jest.fn();
  const repository = {
    createQueryBuilder,
    delete: deleteSessions,
  } as unknown as Repository<AuthSession>;
  const config = {
    getOrThrow: jest.fn().mockReturnValue(30),
  } as unknown as ConfigService;
  const service = new AuthSessionCleanupService(repository, config);

  beforeEach(() => {
    jest.clearAllMocks();
    createQueryBuilder.mockReturnValue(query);
  });

  it('deletes at most one thousand expired or old revoked sessions', async () => {
    getMany.mockResolvedValue([{ id: 'one' }, { id: 'two' }]);
    deleteSessions.mockResolvedValue({ affected: 2 });

    await expect(service.cleanup()).resolves.toEqual({ found: 2, deleted: 2 });
    expect(query.where).toHaveBeenCalledWith(
      'session.refreshExpiresAt <= :now',
      { now: expect.any(Date) },
    );
    expect(query.orWhere).toHaveBeenCalledWith(
      'session.revokedAt <= :revokedBefore',
      { revokedBefore: expect.any(Date) },
    );
    expect(query.orderBy).toHaveBeenCalledWith(
      'session.refreshExpiresAt',
      'ASC',
    );
    expect(query.addOrderBy).toHaveBeenCalledWith('session.id', 'ASC');
    expect(query.take).toHaveBeenCalledWith(1_000);
    expect(deleteSessions).toHaveBeenCalledTimes(1);
  });

  it('does not issue a delete when no stale session exists', async () => {
    getMany.mockResolvedValue([]);
    await expect(service.cleanup()).resolves.toEqual({ found: 0, deleted: 0 });
    expect(deleteSessions).not.toHaveBeenCalled();
  });
});
