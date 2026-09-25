import { jest } from '@jest/globals';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import {
  USER_ROLE,
  type UserRole,
} from '../../config/constants/user/user-role.constants.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const createContext = (role?: UserRole) =>
    ({
      getHandler: () => RolesGuard,
      getClass: () => RolesGuard,
      switchToHttp: () => ({
        getRequest: () =>
          role
            ? {
                auth: {
                  userId: 1,
                  sessionId: 'session-id',
                  authVersion: 1,
                  role,
                },
              }
            : {},
      }),
    }) as unknown as ExecutionContext;

  it('allows endpoints without role metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(createContext())).toBe(true);
  });

  it.each([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN])(
    'allows authorized role %s',
    (role) => {
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValue([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
      } as unknown as Reflector;

      expect(new RolesGuard(reflector).canActivate(createContext(role))).toBe(
        true,
      );
    },
  );

  it.each([USER_ROLE.USER, USER_ROLE.EDITOR, USER_ROLE.SALES, undefined])(
    'rejects unauthorized role %s',
    (role) => {
      const reflector = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValue([USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN]),
      } as unknown as Reflector;

      expect(() =>
        new RolesGuard(reflector).canActivate(createContext(role)),
      ).toThrow(ForbiddenException);
    },
  );
});
