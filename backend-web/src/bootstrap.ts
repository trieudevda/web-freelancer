import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createSwaggerAccessMiddleware } from './common/swagger/swagger-access.middleware.js';
import { AUTH_COOKIE } from './modules/auth/auth-cookie.constants.js';
import { SessionAuthService } from './modules/auth/session-auth.service.js';
import { RequestLifecycleTracker } from './common/runtime/request-lifecycle.middleware.js';

export function configureApplication(
  app: NestExpressApplication,
): RequestLifecycleTracker {
  const config = app.get(ConfigService);
  const cookieSecret = config.getOrThrow<string>('COOKIE_SECRET');
  const apiPrefix = config.getOrThrow<string>('API_PREFIX');
  const trustedProxyCidrs = config
  .get<string>('TRUSTED_PROXY_CIDRS', '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

  app.setGlobalPrefix(apiPrefix);
  app.set('trust proxy', trustedProxyCidrs.length > 0 ? trustedProxyCidrs : false);

  const requestLifecycle = new RequestLifecycleTracker({
    maxConcurrentRequests: config.get<number>('MAX_CONCURRENT_REQUESTS', 200),
    slowRequestThresholdMs: config.get<number>(
      'SLOW_REQUEST_THRESHOLD_MS',
      2_000,
    ),
  });
  app.use(requestLifecycle.middleware());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
  app.use(cookieParser(cookieSecret));

  const corsOrigins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (config.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    setupProtectedSwagger(app, apiPrefix);
  }

  return requestLifecycle;
}

function setupProtectedSwagger(
  app: NestExpressApplication,
  apiPrefix: string,
): void {
  const normalizedPrefix = apiPrefix.replace(/^\/+|\/+$/g, '');
  const docsBasePath = `/${normalizedPrefix}/docs`;
  const sessionAuthService = app.get(SessionAuthService);

  app.use(createSwaggerAccessMiddleware(sessionAuthService, docsBasePath));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Web Freelancer Shop API')
    .setDescription('Backend API cho website bán hàng')
    .setVersion('1.0')
    .addCookieAuth(
      AUTH_COOKIE.ACCESS_TOKEN,
      {
        type: 'apiKey',
        in: 'cookie',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
  });
}
