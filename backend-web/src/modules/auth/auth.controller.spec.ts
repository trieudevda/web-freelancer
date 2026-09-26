import { jest as runtimeJest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import type { AuthCookieService } from './auth-cookie.service.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './auth.types.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

Object.assign(globalThis, { jest: runtimeJest });

describe('AuthController', () => {
  const tokens = {
    tokenType: 'Bearer',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessExpiresAt: new Date('2026-01-01T00:15:00Z'),
    refreshExpiresAt: new Date('2026-02-01T00:00:00Z'),
  };
  const authResult = {
    user: { id: 4, email: 'an@example.com' },
    session: { id: 'session-id', deviceId: 'device-id', deviceName: 'Chrome' },
    tokens,
  };
  const register = jest.fn().mockResolvedValue(authResult);
  const login = jest.fn().mockResolvedValue(authResult);
  const refresh = jest.fn().mockResolvedValue(authResult);
  const logout = jest.fn().mockResolvedValue({ success: true, revoked: true });
  const logoutAll = jest.fn().mockResolvedValue({ success: true });
  const changePassword = jest.fn().mockResolvedValue({ success: true });
  const listSessions = jest.fn().mockResolvedValue([]);
  const revokeSession = jest.fn().mockResolvedValue({ success: true });
  const authService = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    changePassword,
    listSessions,
    revokeSession,
  } as unknown as AuthService;
  const setAuthTokens = jest.fn();
  const setDeviceId = jest.fn();
  const clearAuthTokens = jest.fn();
  const cookieService = {
    setAuthTokens,
    setDeviceId,
    clearAuthTokens,
  } as unknown as AuthCookieService;
  const controller = new AuthController(authService, cookieService);
  const response = {} as Response;
  const auth = {
    userId: 4,
    sessionId: 'current-session',
    authVersion: 1,
    role: USER_ROLE.USER,
  };
  const authenticatedRequest = { auth } as AuthenticatedRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers with a reused signed device id and keeps tokens out of body', async () => {
    const dto = { email: 'an@example.com' } as RegisterDto;
    const request = {
      signedCookies: { device_id: 'signed-device' },
      cookies: {},
      headers: {
        'user-agent': 'Mozilla/5.0 Chrome/120.0 Windows',
        'sec-ch-ua-platform': 'Windows',
      },
      ip: '127.0.0.1',
    } as unknown as Request;

    const body = await controller.register(dto, request, response);

    expect(register).toHaveBeenCalledWith(dto, {
      deviceId: 'signed-device',
      deviceName: 'Chrome · Windows',
      userAgent: request.headers['user-agent'],
      ipAddress: '127.0.0.1',
    });
    expect(setDeviceId).not.toHaveBeenCalled();
    expect(setAuthTokens).toHaveBeenCalledWith(
      response,
      tokens.accessToken,
      tokens.refreshToken,
      tokens,
    );
    expect(body).toEqual({
      user: authResult.user,
      session: authResult.session,
    });
    expect(body).not.toHaveProperty('tokens');
  });

  it('creates and signs a device id when registration has none', async () => {
    const request = {
      signedCookies: {},
      cookies: {},
      headers: {},
      ip: null,
    } as unknown as Request;

    await controller.register({} as RegisterDto, request, response);

    const generatedId = setDeviceId.mock.calls[0][1] as string;
    expect(generatedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(register).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deviceId: generatedId }),
    );
  });

  it('sets cookies only after successful login', async () => {
    const dto: LoginDto = { email: 'an@example.com', password: 'secret' };
    const request = {
      signedCookies: { device_id: 'device' },
      cookies: {},
      headers: {},
    } as unknown as Request;

    await expect(controller.login(dto, request, response)).resolves.toEqual({
      user: authResult.user,
      session: authResult.session,
    });
    expect(setAuthTokens).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    login.mockRejectedValueOnce(new UnauthorizedException());
    await expect(
      controller.login(dto, request, response),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(setAuthTokens).not.toHaveBeenCalled();
  });

  it('requires a refresh cookie and rotates cookies for valid input', async () => {
    const missing = {
      signedCookies: {},
      cookies: {},
      headers: {},
    } as unknown as Request;
    await expect(controller.refresh(missing, response)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const request = {
      signedCookies: {},
      cookies: { refresh_token: 'refresh-token' },
      headers: {},
    } as unknown as Request;
    await expect(controller.refresh(request, response)).resolves.toEqual({
      user: authResult.user,
      session: authResult.session,
    });
    expect(refresh).toHaveBeenCalledWith('refresh-token');
    expect(setAuthTokens).toHaveBeenCalledWith(
      response,
      tokens.accessToken,
      tokens.refreshToken,
      tokens,
    );
  });

  it('clears cookies after logout, logout-all and password change', async () => {
    await controller.logout(authenticatedRequest, response);
    await controller.logoutAll(authenticatedRequest, response);
    const dto: ChangePasswordDto = {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    };
    await controller.changePassword(authenticatedRequest, response, dto);

    expect(logout).toHaveBeenCalledWith(auth);
    expect(logoutAll).toHaveBeenCalledWith(auth);
    expect(changePassword).toHaveBeenCalledWith(auth, dto);
    expect(clearAuthTokens).toHaveBeenCalledTimes(3);
  });

  it('scopes session listing and revocation to authenticated context', async () => {
    await controller.sessions(authenticatedRequest);
    await controller.revokeSession(authenticatedRequest, 'target-session');

    expect(listSessions).toHaveBeenCalledWith(auth);
    expect(revokeSession).toHaveBeenCalledWith(auth, 'target-session');
  });
});
