import { jest as runtimeJest } from '@jest/globals';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { User } from './entities/user.entity.js';
import { UserController } from './user.controller.js';
import type { UserService } from './user.service.js';

Object.assign(globalThis, { jest: runtimeJest });

describe('UserController', () => {
  const user = { id: 7, firstname: 'An', version: 2 } as User;
  const publicUser = { id: 7, firstname: 'An', version: 2 };
  const findById = jest.fn<Promise<User>, [number]>();
  const updateProfileOptimistic = jest.fn<
    Promise<User>,
    [number, UpdateProfileDto]
  >();
  const toPublicUser = jest.fn().mockReturnValue(publicUser);
  const service = {
    findById,
    updateProfileOptimistic,
    toPublicUser,
  } as unknown as UserService;
  const controller = new UserController(service);
  const request = { auth: { userId: 7 } } as AuthenticatedRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the authenticated user and returns only the public projection', async () => {
    findById.mockResolvedValue(user);

    await expect(controller.me(request)).resolves.toEqual(publicUser);
    expect(findById).toHaveBeenCalledWith(7);
    expect(toPublicUser).toHaveBeenCalledWith(user);
  });

  it('passes the authenticated id and validated DTO to optimistic update', async () => {
    const dto = { firstname: 'New', version: 2 } as UpdateProfileDto;
    updateProfileOptimistic.mockResolvedValue(user);

    await expect(controller.updateMe(request, dto)).resolves.toEqual(
      publicUser,
    );
    expect(updateProfileOptimistic).toHaveBeenCalledWith(7, dto);
    expect(toPublicUser).toHaveBeenCalledWith(user);
  });
});
