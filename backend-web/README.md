# Backend Web API

NestJS, TypeORM, MySQL and Redis backend for authentication, user profiles and
the media library.

## Setup

```bash
npm install
copy .env.example .env
npm run migration:run
npm run start:dev
```

The default API prefix is `http://localhost:3001/api/v1`.

Production must use `DB_SYNCHRONIZE=false`. Run migrations before starting a
new release. Redis is required for distributed request throttling.

## Swagger

With `SWAGGER_ENABLED=true` outside production:

- UI: `http://localhost:3001/api/v1/docs`
- OpenAPI JSON: `http://localhost:3001/api/v1/docs-json`

Swagger is intentionally disabled in production and requires a valid
`access_token` cookie belonging to an `admin` or `superadmin` account. Log in
first, then open the documentation URL in the same browser.

## Authentication and CSRF

Authentication uses scoped HttpOnly cookies. Every unsafe request (`POST`,
`PUT`, `PATCH`, `DELETE`) made with auth cookies must include:

- an `Origin` or `Referer` matching `CORS_ORIGINS`;
- the readable `csrf_token` cookie value in the `x-csrf-token` header.

Access and refresh tokens are never returned in response bodies. Refresh
tokens rotate atomically and retain their original absolute expiry.

## API routes

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `PATCH /auth/password`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:id`

### User

- `GET /user/me`
- `PATCH /user/me` — requires the current `version` for optimistic locking.

### Media

- `POST /media` — admin/superadmin, multipart field `file`.
- `POST /media/bulk` — admin/superadmin, multipart field `files`, up to 20.
- `GET /media`
- `GET /media/:id`
- `GET /media/:id/content`
- `PATCH /media/:id` — admin/superadmin.
- `PUT /media/:id/file` — admin/superadmin.
- `DELETE /media/:id` — admin/superadmin, seven-day recoverable deletion.
- `POST /media/:id/restore` — admin/superadmin.

### Health

- `GET /health`
- `GET /health/ready`
- `GET /health/live`

Successful JSON responses use `{ "success": true, "data": ... }`. Errors use
`{ "success": false, "error": ... }`.

## Verification

```bash
npm run lint:check
npm run build
npm run test:unit:ci
npm run test:e2e:ci
npm audit --omit=dev
```
