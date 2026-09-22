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
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthCookieService } from './auth-cookie.service';
import { AUTH_COOKIE } from './auth-cookie.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedRequest, ClientDeviceInfo } from './auth.types';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

    private readonly cookieService: AuthCookieService,
  ) {}

  @Post('register')
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
    );

    return {
      user: result.user,
      session: result.session,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
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
    );

    return {
      user: result.user,
      session: result.session,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {

    const refreshToken = request.cookies?.[AUTH_COOKIE.REFRESH_TOKEN];

    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    const result = await this.authService.refresh(refreshToken);

    this.cookieService.setAuthTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );

    return {
      user: result.user,
      session: result.session,
    };
  }

  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
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
  sessions(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.authService.listSessions(request.auth);
  }

  @UseGuards(SessionAuthGuard)
  @Delete('sessions/:id')
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
    let deviceId = request.signedCookies?.[AUTH_COOKIE.DEVICE_ID];

    if (!deviceId || typeof deviceId !== 'string') {
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
