import { jest } from '@jest/globals';
import {
  BadRequestException,
  type ArgumentsHost,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ApiExceptionFilter } from './api-exception.filter.js';

describe('ApiExceptionFilter', () => {
  const createHost = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/auth/register',
    } as Request;
    const response = { status } as unknown as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  };

  it('normalizes class-validator errors and preserves details', () => {
    const filter = new ApiExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(
      new BadRequestException([
        'email must be an email',
        'password must be longer than or equal to 8 characters',
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        path: '/api/v1/auth/register',
        error: {
          statusCode: 400,
          code: 'HTTP_400',
          message: 'Validation failed',
          details: [
            'email must be an email',
            'password must be longer than or equal to 8 characters',
          ],
        },
      }),
    );
  });

  it('does not expose internal error details in a 500 response', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new ApiExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new Error('database password leaked'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          statusCode: 500,
          code: 'HTTP_500',
          message: 'Internal server error',
        },
      }),
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain(
      'database password leaked',
    );
  });

  it('hides validation details, custom messages, timestamp and path in production', () => {
    const config = {
      get: jest.fn(() => 'production'),
    } as unknown as ConfigService;
    const filter = new ApiExceptionFilter(config);
    const { host, json, status } = createHost();

    filter.catch(
      new BadRequestException([
        'email exists in private database',
        'password policy implementation detail',
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        statusCode: 400,
        code: 'HTTP_400',
        message: 'Bad Request',
      },
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('private database');
    expect(JSON.stringify(json.mock.calls)).not.toContain('/api/v1');
  });

  it('replaces authentication details with a generic production message', () => {
    const config = {
      get: jest.fn(() => 'production'),
    } as unknown as ConfigService;
    const filter = new ApiExceptionFilter(config);
    const { host, json } = createHost();

    filter.catch(
      new UnauthorizedException('Session hash mismatch for user 42'),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        statusCode: 401,
        code: 'HTTP_401',
        message: 'Unauthorized',
      },
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('user 42');
  });
});
