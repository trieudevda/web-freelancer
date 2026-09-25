import { jest as runtimeJest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import { USER_STATUS } from '../../config/constants/user/user-status.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { User } from './entities/user.entity.js';
import { UserService } from './user.service.js';

Object.assign(globalThis, { jest: runtimeJest });

const userFixture = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    firstname: 'Ada',
    lastname: 'Lovelace',
    phone: '0123456789',
    email: 'ada@example.com',
    address: 'London',
    password: 'hash',
    status: USER_STATUS.ACTIVE,
    role: USER_ROLE.USER,
    authVersion: 1,
    version: 1,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    deletedAt: null,
    authSessions: [],
    ...overrides,
  }) as User;

describe('UserService', () => {
  const findOne = jest.fn();
  const create = jest.fn();
  const save = jest.fn();
  const exists = jest.fn();
  const createQueryBuilder = jest.fn();
  const repository = {
    findOne,
    create,
    save,
    exists,
    createQueryBuilder,
  } as unknown as Repository<User>;
  const service = new UserService(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes auth data and persists secure defaults', async () => {
    const user = userFixture();
    findOne.mockResolvedValue(null);
    create.mockReturnValue(user);
    save.mockResolvedValue(user);

    await expect(
      service.createForAuth({
        firstname: ' Ada ',
        lastname: ' Lovelace ',
        phone: ' 0123456789 ',
        email: ' ADA@EXAMPLE.COM ',
        address: ' London ',
        passwordHash: 'derived-hash',
      }),
    ).resolves.toBe(user);

    expect(findOne).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
    });
    expect(create).toHaveBeenCalledWith({
      firstname: 'Ada',
      lastname: 'Lovelace',
      phone: '0123456789',
      email: 'ada@example.com',
      address: 'London',
      password: 'derived-hash',
      status: USER_STATUS.ACTIVE,
      authVersion: 1,
      role: USER_ROLE.USER,
    });
  });

  it('uses the transaction repository when supplied', async () => {
    const transactionSave = jest.fn().mockResolvedValue(userFixture());
    const transactionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue(userFixture()),
      save: transactionSave,
    } as unknown as Repository<User>;
    const managerGetRepository = jest
      .fn()
      .mockReturnValue(transactionRepository);
    const manager = {
      getRepository: managerGetRepository,
    } as unknown as EntityManager;

    await service.createForAuth(
      {
        firstname: 'Ada',
        lastname: 'Lovelace',
        phone: '0123456789',
        email: 'ada@example.com',
        address: 'London',
        passwordHash: 'hash',
      },
      manager,
    );

    expect(managerGetRepository).toHaveBeenCalledWith(User);
    expect(transactionSave).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects an existing normalized email', async () => {
    findOne.mockResolvedValue(userFixture());

    await expect(
      service.createForAuth({
        firstname: 'Ada',
        lastname: 'Lovelace',
        phone: '0123456789',
        email: ' ADA@EXAMPLE.COM ',
        address: 'London',
        passwordHash: 'hash',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('maps only MySQL duplicate errors to a conflict', async () => {
    findOne.mockResolvedValue(null);
    create.mockReturnValue(userFixture());
    save.mockRejectedValueOnce({ driverError: { code: 'ER_DUP_ENTRY' } });

    await expect(
      service.createForAuth({
        firstname: 'Ada',
        lastname: 'Lovelace',
        phone: '0123456789',
        email: 'ada@example.com',
        address: 'London',
        passwordHash: 'hash',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const databaseError = new Error('connection lost');
    save.mockRejectedValueOnce(databaseError);
    await expect(
      service.createForAuth({
        firstname: 'Ada',
        lastname: 'Lovelace',
        phone: '0123456789',
        email: 'other@example.com',
        address: 'London',
        passwordHash: 'hash',
      }),
    ).rejects.toBe(databaseError);
  });

  it('uses an indexed normalized equality query and can lock it', async () => {
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(userFixture()),
    };
    createQueryBuilder.mockReturnValue(query);

    await service.findByEmailWithPassword(' ADA@EXAMPLE.COM ');
    expect(query.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'ada@example.com',
    });
    expect(query.andWhere).toHaveBeenCalledWith('user.deletedAt IS NULL');

    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as EntityManager;
    await service.findByEmailWithPasswordForUpdate('ADA@EXAMPLE.COM', manager);
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
  });

  it('returns not found for a missing user', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.findById(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only editable fields with a version condition', async () => {
    const updated = userFixture({ firstname: 'Grace', version: 3 });
    const query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    createQueryBuilder.mockReturnValue(query);
    findOne.mockResolvedValue(updated);
    const dto = {
      firstname: ' Grace ',
      address: ' London ',
      version: 2,
    } as UpdateProfileDto;

    await expect(service.updateProfileOptimistic(1, dto)).resolves.toBe(
      updated,
    );
    expect(query.set).toHaveBeenCalledWith({
      firstname: 'Grace',
      address: 'London',
      version: expect.any(Function),
    });
    expect(query.andWhere).toHaveBeenCalledWith('version = :version', {
      version: 2,
    });
    expect(query.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
  });

  it('distinguishes stale versions from deleted users', async () => {
    const query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    createQueryBuilder.mockReturnValue(query);
    exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const dto = { firstname: 'Grace', version: 1 } as UpdateProfileDto;

    await expect(
      service.updateProfileOptimistic(1, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.updateProfileOptimistic(1, dto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not issue an update when no editable field is supplied', async () => {
    const user = userFixture();
    findOne.mockResolvedValue(user);
    const dto: UpdateProfileDto = { version: 1 };
    await expect(service.updateProfileOptimistic(1, dto)).resolves.toBe(user);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('projects only documented public fields', () => {
    const publicUser = service.toPublicUser(userFixture());
    expect(publicUser).not.toHaveProperty('password');
    expect(publicUser).not.toHaveProperty('authVersion');
    expect(publicUser).not.toHaveProperty('deletedAt');
    expect(Object.keys(publicUser)).toEqual([
      'id',
      'firstname',
      'lastname',
      'phone',
      'email',
      'address',
      'status',
      'role',
      'version',
      'createdAt',
      'updatedAt',
    ]);
  });
});
