import { jest } from '@jest/globals';
import { Module, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { RedisToken } from '@nestjs-redis/client';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';
import { configureApplication } from '../src/bootstrap.js';
import { ApiExceptionFilter } from '../src/common/http/api-exception.filter.js';
import { ApiResponseInterceptor } from '../src/common/http/api-response.interceptor.js';
import { USER_ROLE } from '../src/config/constants/user/user-role.constants.js';
import { AuthCookieService } from '../src/modules/auth/auth-cookie.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import type { AuthContext } from '../src/modules/auth/auth.types.js';
import { CsrfGuard } from '../src/modules/auth/csrf.guard.js';
import { RolesGuard } from '../src/modules/auth/roles.guard.js';
import { SessionAuthGuard } from '../src/modules/auth/session-auth.guard.js';
import { SessionAuthService } from '../src/modules/auth/session-auth.service.js';
import { HealthController } from '../src/modules/health/health.controller.js';
import { MediaController } from '../src/modules/media/media.controller.js';
import { MediaService } from '../src/modules/media/media.service.js';
import { UserController } from '../src/modules/user/user.controller.js';
import { UserService } from '../src/modules/user/user.service.js';

jest.unstable_mockModule('@nestjs/throttler', () => ({
  Throttle: () => () => undefined,
}));

const { AuthController } =
  await import('../src/modules/auth/auth.controller.js');

const TEST_ORIGIN = 'http://localhost:3000';
const API = '/api/v1';
const CSRF = 'csrf-test-token';

const publicUser = {
  id: 1,
  firstname: 'Test',
  lastname: 'User',
  phone: '0900000000',
  email: 'test@example.com',
  address: 'Hồ Chí Minh',
  status: 'active',
  role: USER_ROLE.USER,
  version: 1,
};

const authResult = {
  user: publicUser,
  session: {
    id: '11111111-1111-4111-8111-111111111111',
    deviceId: 'device-1',
    deviceName: 'Chrome · Windows',
  },
  tokens: {
    accessToken: 'user-token',
    refreshToken: 'refresh-token',
    accessExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    refreshExpiresAt: new Date('2030-02-01T00:00:00.000Z'),
  },
};

const authService = {
  register: jest.fn(async () => authResult),
  login: jest.fn(async () => authResult),
  refresh: jest.fn(async () => authResult),
  logout: jest.fn(async () => ({ success: true, revoked: true })),
  logoutAll: jest.fn(async () => ({ success: true })),
  changePassword: jest.fn(async () => ({ success: true })),
  listSessions: jest.fn(async () => [authResult.session]),
  revokeSession: jest.fn(async () => ({ success: true })),
};

const userService = {
  findById: jest.fn(async () => publicUser),
  updateProfileOptimistic: jest.fn(async () => ({
    ...publicUser,
    firstname: 'Updated',
    version: 2,
  })),
  toPublicUser: jest.fn((user: typeof publicUser) => user),
};

const mediaItem = {
  id: '22222222-2222-4222-8222-222222222222',
  originalName: 'product.jpg',
  mimeType: 'image/jpeg',
  title: 'Product',
};

const mediaService = {
  create: jest.fn(async () => mediaItem),
  createMany: jest.fn(async () => ({ total: 1, items: [mediaItem] })),
  replaceFile: jest.fn(async () => ({ media: mediaItem })),
  search: jest.fn(async () => ({
    items: [mediaItem],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })),
  findActive: jest.fn(async () => mediaItem),
  getContentPath: jest.fn(),
  update: jest.fn(async () => mediaItem),
  requestDelete: jest.fn(async () => mediaItem),
  restore: jest.fn(async () => mediaItem),
};

const sessionAuthService = {
  validateAccessToken: jest.fn(async (token: string): Promise<AuthContext> => {
    const roles = {
      'user-token': USER_ROLE.USER,
      'admin-token': USER_ROLE.ADMIN,
      'superadmin-token': USER_ROLE.SUPERADMIN,
    } as const;
    const role = roles[token as keyof typeof roles];

    if (!role) {
      throw new UnauthorizedException('Invalid session');
    }

    return {
      userId: 1,
      sessionId: '11111111-1111-4111-8111-111111111111',
      authVersion: 1,
      role,
    };
  }),
};

const dataSource = {
  query: jest.fn(async () => [{ result: 1 }]),
};

const redis = {
  ping: jest.fn(async () => 'PONG'),
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [
        () => ({
          NODE_ENV: 'test',
          API_PREFIX: 'api/v1',
          CORS_ORIGINS: TEST_ORIGIN,
          COOKIE_SECRET: 'a'.repeat(64),
          COOKIE_DOMAIN: '',
          AUTH_ACCESS_TTL_SECONDS: 900,
          AUTH_REFRESH_TTL_SECONDS: 2_592_000,
          SWAGGER_ENABLED: true,
        }),
      ],
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    UserController,
    MediaController,
    HealthController,
  ],
  providers: [
    AppService,
    AuthCookieService,
    SessionAuthGuard,
    RolesGuard,
    { provide: AuthService, useValue: authService },
    { provide: UserService, useValue: userService },
    { provide: MediaService, useValue: mediaService },
    { provide: SessionAuthService, useValue: sessionAuthService },
    { provide: DataSource, useValue: dataSource },
    { provide: RedisToken(), useValue: redis },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
class E2eApplicationModule {}

describe('Application HTTP integration/e2e', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [E2eApplicationModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bootstrap, health and response format', () => {
    it('uses the real API prefix, response interceptor and security headers', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API}/`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: 'Hello World!',
      });
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('reports database availability through the health endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API}/health`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        status: 'ok',
        database: 'up',
      });
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('returns the uniform validation error and rejects unknown fields', async () => {
      const response = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .set('Origin', TEST_ORIGIN)
        .send({ email: 'invalid', password: '', role: 'admin' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          statusCode: 400,
          code: 'HTTP_400',
          message: 'Validation failed',
        },
        path: `${API}/auth/login`,
      });
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.stringContaining('role')]),
      );
    });
  });

  describe('authentication and cookie session flow', () => {
    it('registers without exposing tokens and sets scoped HttpOnly cookies', async () => {
      const response = await request(app.getHttpServer())
        .post(`${API}/auth/register`)
        .set('Origin', TEST_ORIGIN)
        .send({
          firstname: 'Test',
          lastname: 'User',
          phone: '0900000000',
          email: 'test@example.com',
          address: 'Hồ Chí Minh',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(response.body.data).toEqual({
        user: publicUser,
        session: authResult.session,
      });
      expect(JSON.stringify(response.body)).not.toContain('accessToken');
      expect(JSON.stringify(response.body)).not.toContain('refreshToken');

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /^(?=.*access_token=)(?=.*Path=\/api\/v1;)(?=.*HttpOnly)/i,
          ),
          expect.stringMatching(
            /^(?=.*refresh_token=)(?=.*Path=\/api\/v1\/auth\/refresh;)(?=.*HttpOnly)/i,
          ),
          expect.stringMatching(/csrf_token=.*Path=\//i),
        ]),
      );
    });

    it('logs in from a trusted origin and forwards bounded device data', async () => {
      const response = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .set('Origin', TEST_ORIGIN)
        .set('User-Agent', 'Mozilla/5.0 Windows Chrome/120.0')
        .send({ email: 'test@example.com', password: 'ValidPassword123!' })
        .expect(200);

      expect(response.body.data.user).toEqual(publicUser);
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
        expect.objectContaining({
          deviceId: expect.any(String),
          deviceName: 'Chrome · Windows',
          userAgent: 'Mozilla/5.0 Windows Chrome/120.0',
        }),
      );
    });

    it('rejects login from an untrusted origin before calling AuthService', async () => {
      await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .set('Origin', 'https://attacker.example')
        .send({ email: 'test@example.com', password: 'ValidPassword123!' })
        .expect(403);

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('rotates refresh cookies only with matching CSRF tokens', async () => {
      const response = await request(app.getHttpServer())
        .post(`${API}/auth/refresh`)
        .set('Origin', TEST_ORIGIN)
        .set('x-csrf-token', CSRF)
        .set('Cookie', ['refresh_token=refresh-token', `csrf_token=${CSRF}`])
        .expect(200);

      expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
      expect(JSON.stringify(response.body)).not.toContain('refreshToken');
    });

    it('rejects refresh when the CSRF header is missing', async () => {
      await request(app.getHttpServer())
        .post(`${API}/auth/refresh`)
        .set('Origin', TEST_ORIGIN)
        .set('Cookie', ['refresh_token=refresh-token', `csrf_token=${CSRF}`])
        .expect(403);

      expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('logs out the current session and expires all auth cookies', async () => {
      const response = await authenticatedRequest(
        'post',
        `${API}/auth/logout`,
      ).expect(200);

      expect(authService.logout).toHaveBeenCalledWith(
        expect.objectContaining({ role: USER_ROLE.USER }),
      );
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/access_token=;/),
          expect.stringMatching(/refresh_token=;/),
          expect.stringMatching(/csrf_token=;/),
        ]),
      );
    });
  });

  describe('profile and session authorization', () => {
    it('rejects profile access without an access-token cookie', async () => {
      await request(app.getHttpServer()).get(`${API}/user/me`).expect(401);
      expect(userService.findById).not.toHaveBeenCalled();
    });

    it('returns only the authenticated user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API}/user/me`)
        .set('Cookie', 'access_token=user-token')
        .expect(200);

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(response.body.data).toEqual(publicUser);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('authVersion');
    });

    it('updates profile with authenticated id and validated optimistic version', async () => {
      const response = await authenticatedRequest('patch', `${API}/user/me`)
        .send({ firstname: 'Updated', version: 1 })
        .expect(200);

      expect(userService.updateProfileOptimistic).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ firstname: 'Updated', version: 1 }),
      );
      expect(response.body.data).toMatchObject({
        firstname: 'Updated',
        version: 2,
      });
    });

    it('lists and revokes only sessions through authenticated context', async () => {
      await request(app.getHttpServer())
        .get(`${API}/auth/sessions`)
        .set('Cookie', 'access_token=user-token')
        .expect(200);

      await authenticatedRequest(
        'delete',
        `${API}/auth/sessions/33333333-3333-4333-8333-333333333333`,
      ).expect(200);

      expect(authService.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
      );
      expect(authService.revokeSession).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
        '33333333-3333-4333-8333-333333333333',
      );
    });
  });

  describe('media RBAC', () => {
    it('rejects all media endpoints for anonymous requests', async () => {
      await request(app.getHttpServer()).get(`${API}/media`).expect(401);
      expect(mediaService.search).not.toHaveBeenCalled();
    });

    it('allows an authenticated user to search media', async () => {
      const response = await request(app.getHttpServer())
        .get(`${API}/media?page=1&limit=20`)
        .set('Cookie', 'access_token=user-token')
        .expect(200);

      expect(response.body.data.items).toEqual([mediaItem]);
      expect(mediaService.search).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('forbids normal users from uploading, updating, deleting or restoring', async () => {
      const endpoints = [
        ['post', `${API}/media`],
        ['patch', `${API}/media/${mediaItem.id}`],
        ['delete', `${API}/media/${mediaItem.id}`],
        ['post', `${API}/media/${mediaItem.id}/restore`],
      ] as const;

      for (const [method, endpoint] of endpoints) {
        await authenticatedRequest(method, endpoint).expect(403);
      }

      expect(mediaService.create).not.toHaveBeenCalled();
      expect(mediaService.update).not.toHaveBeenCalled();
      expect(mediaService.requestDelete).not.toHaveBeenCalled();
      expect(mediaService.restore).not.toHaveBeenCalled();
    });

    it.each(['admin-token', 'superadmin-token'])(
      'allows %s to upload valid multipart media',
      async (token) => {
        const jpeg = Buffer.concat([
          Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
          Buffer.alloc(28),
          Buffer.from([0xff, 0xd9]),
        ]);
        const response = await privilegedRequest('post', `${API}/media`, token)
          .field('title', 'Product')
          .attach('file', jpeg, {
            filename: 'product.jpg',
            contentType: 'image/jpeg',
          })
          .expect(201);

        expect(response.body.data).toEqual(mediaItem);
        expect(mediaService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalname: 'product.jpg',
            mimetype: 'image/jpeg',
          }),
          expect.objectContaining({ title: 'Product' }),
        );
      },
    );
  });

  describe('protected Swagger', () => {
    it('returns 401 for anonymous and invalid sessions', async () => {
      await request(app.getHttpServer()).get(`${API}/docs`).expect(401);
      await request(app.getHttpServer())
        .get(`${API}/docs-json`)
        .set('Cookie', 'access_token=invalid-token')
        .expect(401);
    });

    it('returns 403 for a normal authenticated user', async () => {
      await request(app.getHttpServer())
        .get(`${API}/docs`)
        .set('Cookie', 'access_token=user-token')
        .expect(403);
    });

    it.each(['admin-token', 'superadmin-token'])(
      'serves both UI and JSON to privileged token %s',
      async (token) => {
        const ui = await request(app.getHttpServer())
          .get(`${API}/docs`)
          .set('Cookie', `access_token=${token}`)
          .expect(200);
        const json = await request(app.getHttpServer())
          .get(`${API}/docs-json`)
          .set('Cookie', `access_token=${token}`)
          .expect(200);

        expect(ui.text).toContain('swagger-ui');
        expect(json.body.info.title).toBe('Web Freelancer Shop API');
        expect(ui.headers['cache-control']).toBe('no-store');
      },
    );
  });

  function authenticatedRequest(
    method: 'post' | 'patch' | 'delete',
    path: string,
  ) {
    return privilegedRequest(method, path, 'user-token');
  }

  function privilegedRequest(
    method: 'post' | 'patch' | 'delete',
    path: string,
    token: string,
  ) {
    return request(app.getHttpServer())
      [method](path)
      .set('Origin', TEST_ORIGIN)
      .set('x-csrf-token', CSRF)
      .set('Cookie', [`access_token=${token}`, `csrf_token=${CSRF}`]);
  }
});
