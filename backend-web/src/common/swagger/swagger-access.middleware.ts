import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { USER_ROLE } from '../../config/constants/user/user-role.constants.js';
import type { UserRole } from '../../config/constants/user/user-role.constants.js';
import { AUTH_COOKIE } from '../../modules/auth/auth-cookie.constants.js';
import { readRequestCookie } from '../../modules/auth/auth-cookie.util.js';
import type { SessionAuthService } from '../../modules/auth/session-auth.service.js';

const SWAGGER_ROLES = new Set<UserRole>([
  USER_ROLE.ADMIN,
  USER_ROLE.SUPERADMIN,
]);

export function isSwaggerRequest(
  requestPath: string,
  docsBasePath: string,
): boolean {
  return (
    requestPath === docsBasePath ||
    requestPath.startsWith(`${docsBasePath}/`) ||
    requestPath.startsWith(`${docsBasePath}-`)
  );
}

export function createSwaggerAccessMiddleware(
  sessionAuthService: SessionAuthService,
  docsBasePath: string,
) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const requestPath = request.originalUrl.split('?')[0];

    if (!isSwaggerRequest(requestPath, docsBasePath)) {
      next();
      return;
    }

    response.setHeader('Cache-Control', 'no-store');

    const accessToken = readRequestCookie(request, AUTH_COOKIE.ACCESS_TOKEN);

    if (!accessToken) {
      sendError(
        response,
        HttpStatus.UNAUTHORIZED,
        'Authentication is required to access API documentation',
        request.originalUrl,
      );
      return;
    }

    try {
      const auth = await sessionAuthService.validateAccessToken(accessToken);

      if (!SWAGGER_ROLES.has(auth.role)) {
        sendError(
          response,
          HttpStatus.FORBIDDEN,
          'Only administrators can access API documentation',
          request.originalUrl,
        );
        return;
      }

      next();
    } catch {
      sendError(
        response,
        HttpStatus.UNAUTHORIZED,
        'The session used to access API documentation is invalid',
        request.originalUrl,
      );
    }
  };
}

function sendError(
  response: Response,
  statusCode: number,
  message: string,
  path: string,
): void {
  response.status(statusCode).json({
    success: false,
    error: {
      statusCode,
      code: `HTTP_${statusCode}`,
      message,
    },
    timestamp: new Date().toISOString(),
    path,
  });
}
