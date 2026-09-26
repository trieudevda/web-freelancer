import { jest as runtimeJest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import { USER_STATUS } from '../../config/constants/user/user-status.js';
import { User } from '../user/entities/user.entity.js';
import type { UserService } from '../user/user.service.js';
import { createSessionToken } from './auth-token.util.js';
import { AuthService } from './auth.service.js';
import type { AuthContext, ClientDeviceInfo } from './auth.types.js';
import { AuthSession } from './entities/auth-session.entity.js';
import { hashPassword, verifyPassword } from './password.util.js';

Object.assign(globalThis, { jest: runtimeJest });

const userFixture = (overrides: Partial<User> = {}): User => ({
  id: 3,
  firstname: 'An',
  lastname: 'Nguyen',
  phone: '0900000000',
  email: 'an@example.com',
  address: 'HCM',
  password: 'hash',
  authVersion: 2,
  version: 1,
  role: USER_ROLE.USER,
  status: USER_STATUS.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});

const sessionFixture = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  id: '09e95653-20db-46c8-b5f1-fcf2f8c48061',
  userId: 3,
  user: userFixture(),
  authVersion: 2,
  deviceId: 'device-1',
  deviceName: 'Chrome',
  userAgent: 'agent',
  ipAddress: '127.0.0.1',
  accessTokenHash: 'a'.repeat(64),
  refreshTokenHash: 'b'.repeat(64),
  accessExpiresAt: new Date(Date.now() + 60_000),
  refreshExpiresAt: new Date(Date.now() + 3_600_000),
  lastUsedAt: new Date(),
  revokedAt: null,
  revokedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const updateQuery = (affected = 1) => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected }),
});

describe('AuthService', () => {
  const sessionFind = jest.fn();
  const sessionCreate = jest.fn();
  const sessionSave = jest.fn();
  const sessionCreateQueryBuilder = jest.fn();
  const sessionRepository = {
    find: sessionFind,
    create: sessionCreate,
    save: sessionSave,
    createQueryBuilder: sessionCreateQueryBuilder,
  } as unknown as Repository<AuthSession>;
  const createForAuth = jest.fn();
  const findByEmailWithPassword = jest.fn();
  const findByEmailWithPasswordForUpdate = jest.fn();
  const findWithPasswordForUpdate = jest.fn();
  const toPublicUser = jest.fn((user: User) => ({
    id: user.id,
    email: user.email,
  }));
  const userService = {
    createForAuth,
    findByEmailWithPassword,
    findByEmailWithPasswordForUpdate,
    findWithPasswordForUpdate,
    toPublicUser,
  } as unknown as UserService;
  const userFindOne = jest.fn();
  const userSave = jest.fn();
  const userRepository = {
    findOne: userFindOne,
    save: userSave,
  } as unknown as Repository<User>;
  const txSessionCreate = jest.fn();
  const txSessionSave = jest.fn();
  const txSessionCreateQueryBuilder = jest.fn();
  const txSessionRepository = {
    create: txSessionCreate,
    save: txSessionSave,
    createQueryBuilder: txSessionCreateQueryBuilder,
  } as unknown as Repository<AuthSession>;
  const manager = {
    getRepository: jest.fn((entity: typeof User | typeof AuthSession) =>
      entity === User ? userRepository : txSessionRepository,
    ),
  } as unknown as EntityManager;
  const transaction = jest.fn(
    async (callback: (value: EntityManager) => Promise<unknown>) =>
      callback(manager),
  );
  const dataSource = { transaction } as unknown as DataSource;
  const config = {
    get: jest.fn((key: string, fallback: number) => {
      if (key === 'AUTH_ACCESS_TTL_SECONDS') return 60;
      if (key === 'AUTH_REFRESH_TTL_SECONDS') return 3600;
      return fallback;
    }),
  } as unknown as ConfigService;
  const service = new AuthService(
    sessionRepository,
    userService,
    dataSource,
    config,
  );
  const auth: AuthContext = {
    userId: 3,
    sessionId: '09e95653-20db-46c8-b5f1-fcf2f8c48061',
    authVersion: 2,
    role: USER_ROLE.USER,
  };
  const device: ClientDeviceInfo = {
    deviceId: ' device-1 ',
    deviceName: ` ${'x'.repeat(300)} `,
    userAgent: 'u'.repeat(1100),
    ipAddress: '1'.repeat(50),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user and session atomically without storing plaintext', async () => {
    const user = userFixture();
    createForAuth.mockResolvedValue(user);
    userFindOne.mockResolvedValue(user);
    txSessionCreateQueryBuilder.mockReturnValue(updateQuery());
    txSessionCreate.mockImplementation((value: AuthSession) => value);
    txSessionSave.mockImplementation(async (value: AuthSession) => value);
    const dto = {
      firstname: 'An',
      lastname: 'Nguyen',
      phone: '0900000000',
      email: 'an@example.com',
      address: 'HCM',
      password: 'plain-password',
    };

    const result = await service.register(dto, device);

    expect(transaction).toHaveBeenCalledTimes(1);
    const createdInput = createForAuth.mock.calls[0][0] as {
      passwordHash: string;
    };
    expect(createdInput.passwordHash).not.toBe(dto.password);
    await expect(
      verifyPassword(dto.password, createdInput.passwordHash),
    ).resolves.toBe(true);
    expect(createForAuth.mock.calls[0][1]).toBe(manager);
    expect(result).not.toHaveProperty('password');
    expect(result.tokens.accessToken).not.toBe(
      (txSessionCreate.mock.calls[0][0] as AuthSession).accessTokenHash,
    );
  });

  it('validates active credentials and rejects wrong or inactive accounts', async () => {
    const password = 'correct-password';
    const passwordHash = await hashPassword(password);
    findByEmailWithPassword.mockResolvedValue(
      userFixture({ password: passwordHash }),
    );
    await expect(
      service.validateCredentials('an@example.com', password),
    ).resolves.toMatchObject({ id: 3 });

    await expect(
      service.validateCredentials('an@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      service.validateCredentials('missing@example.com', password),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    findByEmailWithPassword.mockResolvedValue(
      userFixture({ password: passwordHash, status: USER_STATUS.SUSPENDED }),
    );
    await expect(
      service.validateCredentials('an@example.com', password),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('locks the user and replaces only the same device session on login', async () => {
    const user = userFixture({ password: await hashPassword('password') });
    findByEmailWithPasswordForUpdate.mockResolvedValue(user);
    userFindOne.mockResolvedValue(user);
    const query = updateQuery();
    txSessionCreateQueryBuilder.mockReturnValue(query);
    txSessionCreate.mockImplementation((value: AuthSession) => value);
    txSessionSave.mockImplementation(async (value: AuthSession) => value);

    await service.login({ email: user.email, password: 'password' }, device);

    expect(findByEmailWithPasswordForUpdate).toHaveBeenCalledWith(
      user.email,
      manager,
    );
    expect(userFindOne).toHaveBeenCalledWith({
      where: { id: 3 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(query.where).toHaveBeenCalledWith('user_id = :userId', {
      userId: 3,
    });
    expect(query.andWhere).toHaveBeenCalledWith('device_id = :deviceId', {
      deviceId: 'device-1',
    });
    const created = txSessionCreate.mock.calls[0][0] as AuthSession;
    expect(created.deviceName).toHaveLength(255);
    expect(created.userAgent).toHaveLength(1000);
    expect(created.ipAddress).toHaveLength(45);
    expect(created.accessTokenHash).toHaveLength(64);
    expect(created.refreshTokenHash).toHaveLength(64);
  });

  it('rotates a valid refresh token under a row lock without extending expiry', async () => {
    const issued = createSessionToken(
      '09e95653-20db-46c8-b5f1-fcf2f8c48061',
      48,
    );
    const absoluteExpiry = new Date(Date.now() + 3_600_000);
    const session = sessionFixture({
      refreshTokenHash: issued.hash,
      refreshExpiresAt: absoluteExpiry,
    });
    const selectQuery = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(session),
    };
    txSessionCreateQueryBuilder.mockReturnValue(selectQuery);
    txSessionSave.mockResolvedValue(session);

    const result = await service.refresh(issued.token);

    expect(selectQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(txSessionSave).toHaveBeenCalledWith(session);
    expect(result.tokens.refreshExpiresAt).toBe(absoluteExpiry);
    expect(result.tokens.refreshToken).not.toBe(issued.token);
  });

  it('rejects malformed, revoked and reused refresh tokens', async () => {
    await expect(service.refresh('not-a-session-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const issued = createSessionToken(
      '09e95653-20db-46c8-b5f1-fcf2f8c48061',
      48,
    );
    const selectQuery = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValueOnce(
          sessionFixture({
            refreshTokenHash: issued.hash,
            revokedAt: new Date(),
          }),
        )
        .mockResolvedValueOnce(
          sessionFixture({ refreshTokenHash: '0'.repeat(64) }),
        ),
    };
    txSessionCreateQueryBuilder.mockReturnValue(selectQuery);

    await expect(service.refresh(issued.token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refresh(issued.token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(txSessionSave).not.toHaveBeenCalled();
  });

  it('scopes logout and targeted revocation by both user and session', async () => {
    const logoutQuery = updateQuery(1);
    sessionCreateQueryBuilder.mockReturnValueOnce(logoutQuery);
    await expect(service.logout(auth)).resolves.toEqual({
      success: true,
      revoked: true,
    });
    expect(logoutQuery.where).toHaveBeenCalledWith('id = :sessionId', {
      sessionId: auth.sessionId,
    });
    expect(logoutQuery.andWhere).toHaveBeenCalledWith('user_id = :userId', {
      userId: auth.userId,
    });

    const revokeQuery = updateQuery(0);
    sessionCreateQueryBuilder.mockReturnValueOnce(revokeQuery);
    await expect(
      service.revokeSession(auth, 'missing-session'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only active sessions and marks the current one', async () => {
    sessionFind.mockResolvedValue([
      sessionFixture({ id: auth.sessionId }),
      sessionFixture({ id: 'other-session' }),
    ]);
    const result = await service.listSessions(auth);

    expect(sessionFind).toHaveBeenCalledWith({
      where: { userId: 3, revokedAt: expect.anything() },
      order: { lastUsedAt: 'DESC' },
    });
    expect(result.map((value) => value.isCurrent)).toEqual([true, false]);
    expect(result[0]).not.toHaveProperty('accessTokenHash');
    expect(result[0]).not.toHaveProperty('refreshTokenHash');
  });

  it('increments auth version and revokes all sessions atomically', async () => {
    const user = userFixture({ authVersion: 2 });
    userFindOne.mockResolvedValue(user);
    userSave.mockResolvedValue(user);
    txSessionCreateQueryBuilder.mockReturnValue(updateQuery());

    await expect(service.logoutAll(auth)).resolves.toEqual({ success: true });
    expect(user.authVersion).toBe(3);
    expect(userSave).toHaveBeenCalledWith(user);
  });

  it('changes the password and revokes all sessions in one transaction', async () => {
    const user = userFixture({ password: await hashPassword('old-password') });
    findWithPasswordForUpdate.mockResolvedValue(user);
    userSave.mockResolvedValue(user);
    txSessionCreateQueryBuilder.mockReturnValue(updateQuery());

    await expect(
      service.changePassword(auth, {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).resolves.toMatchObject({ success: true });
    expect(user.authVersion).toBe(3);
    await expect(verifyPassword('new-password', user.password)).resolves.toBe(
      true,
    );
  });

  it('rejects unchanged or incorrect current passwords without persistence', async () => {
    await expect(
      service.changePassword(auth, {
        currentPassword: 'same-password',
        newPassword: 'same-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    findWithPasswordForUpdate.mockResolvedValue(
      userFixture({ password: await hashPassword('correct-password') }),
    );
    await expect(
      service.changePassword(auth, {
        currentPassword: 'incorrect-password',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userSave).not.toHaveBeenCalled();
  });
});
