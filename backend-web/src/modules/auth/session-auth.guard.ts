// src/modules/auth/session-auth.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_COOKIE } from './auth-cookie.constants';
import { AuthenticatedRequest } from './auth.types';
import { SessionAuthService } from './session-auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionAuthService: SessionAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const accessToken = request.cookies?.[AUTH_COOKIE.ACCESS_TOKEN];

    if (!accessToken || typeof accessToken !== 'string') {
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    const auth = await this.sessionAuthService.validateAccessToken(accessToken);

    (request as AuthenticatedRequest).auth = auth;

    return true;
  }
}
