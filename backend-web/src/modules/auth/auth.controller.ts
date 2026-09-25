import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AUTH_COOKIE } from './auth-cookie.constants.js';
import { readRequestCookie } from './auth-cookie.util.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AuthenticatedRequest, ClientDeviceInfo } from './auth.types.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

    private readonly cookieService: AuthCookieService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a user and create a login session' })
  @ApiCreatedResponse({ description: 'User and session created' })
  @ApiForbiddenResponse({ description: 'Origin is not allowed' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body()
    dto: RegisterDto,

    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const device = this.getDeviceInfo(request, response);

    const result = await this.authService.register(dto, device);

    this.cookieService.setAuthTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens,
    );

    return {
      user: result.user,
      session: result.session,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ description: 'Credentials accepted and cookies set' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body()
    dto: LoginDto,

    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const device = this.getDeviceInfo(request, response);

    const result = await this.authService.login(dto, device);

    this.cookieService.setAuthTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens,
    );

    return {
      user: result.user,
      session: result.session,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiOkResponse({ description: 'Session tokens rotated' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
  })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const refreshToken = readRequestCookie(request, AUTH_COOKIE.REFRESH_TOKEN);

    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    const result = await this.authService.refresh(refreshToken);

    this.cookieService.setAuthTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens,
    );

    return {
      user: result.user,
      session: result.session,
    };
  }

  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(
    @Req()
    request: AuthenticatedRequest,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result = await this.authService.logout(request.auth);

    this.cookieService.clearAuthTokens(response);

    return result;
  }

  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Revoke every session for the current user' })
  async logoutAll(
    @Req()
    request: AuthenticatedRequest,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result = await this.authService.logoutAll(request.auth);

    this.cookieService.clearAuthTokens(response);

    return result;
  }

  @UseGuards(SessionAuthGuard)
  @Patch('password')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Change password and revoke all sessions' })
  async changePassword(
    @Req()
    request: AuthenticatedRequest,

    @Res({
      passthrough: true,
    })
    response: Response,

    @Body()
    dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(request.auth, dto);

    // Đổi password = logout tất cả.
    this.cookieService.clearAuthTokens(response);

    return result;
  }

  @UseGuards(SessionAuthGuard)
  @Get('sessions')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'List active sessions for the current user' })
  sessions(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.authService.listSessions(request.auth);
  }

  @UseGuards(SessionAuthGuard)
  @Delete('sessions/:id')
  @ApiCookieAuth('access-token')
  @ApiOperation({ summary: 'Revoke one session owned by the current user' })
  revokeSession(
    @Req()
    request: AuthenticatedRequest,

    @Param('id', ParseUUIDPipe)
    sessionId: string,
  ) {
    return this.authService.revokeSession(request.auth, sessionId);
  }

  private getDeviceInfo(
    request: Request,
    response: Response,
  ): ClientDeviceInfo {
    let deviceId = readRequestCookie(request, AUTH_COOKIE.DEVICE_ID, true);

    if (!deviceId) {
      deviceId = randomUUID();

      this.cookieService.setDeviceId(response, deviceId);
    }

    return {
      deviceId,

      deviceName: this.detectDeviceName(request),

      userAgent: request.headers['user-agent'] ?? null,

      ipAddress: request.ip ?? null,
    };
  }

  private detectDeviceName(request: Request): string {
    const ua = request.headers['user-agent'] ?? '';

    const platform = request.headers['sec-ch-ua-platform']?.toString() ?? '';

    let os = 'Unknown';

    if (/iphone/i.test(ua)) {
      os = 'iPhone';
    } else if (/ipad/i.test(ua)) {
      os = 'iPad';
    } else if (/android/i.test(ua)) {
      os = 'Android';
    } else if (/windows/i.test(platform) || /windows/i.test(ua)) {
      os = 'Windows';
    } else if (/mac/i.test(platform) || /macintosh/i.test(ua)) {
      os = 'macOS';
    } else if (/linux/i.test(ua)) {
      os = 'Linux';
    }

    let browser = 'Browser';

    if (/edg\//i.test(ua)) {
      browser = 'Edge';
    } else if (/chrome\//i.test(ua)) {
      browser = 'Chrome';
    } else if (/firefox\//i.test(ua)) {
      browser = 'Firefox';
    } else if (/safari\//i.test(ua)) {
      browser = 'Safari';
    }

    return `${browser} · ${os}`;
  }
}
