import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import express from 'express';
import request from 'supertest';
import { RequestLifecycleTracker } from './request-lifecycle.middleware.js';

describe('RequestLifecycleTracker', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  it('preserves a safe request id and generates one for unsafe input', async () => {
    const tracker = new RequestLifecycleTracker({
      maxConcurrentRequests: 2,
      slowRequestThresholdMs: 1_000,
    });
    const app = express();
    app.use(tracker.middleware());
    app.get('/ok', (_request, response) => response.sendStatus(204));

    const supplied = await request(app)
      .get('/ok')
      .set('x-request-id', 'safe_request_123')
      .expect(204);
    const generated = await request(app)
      .get('/ok')
      .set('x-request-id', 'short')
      .expect(204);

    expect(supplied.headers['x-request-id']).toBe('safe_request_123');
    expect(generated.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/,
    );
  });

  it('rejects excess concurrent requests with 503 and Retry-After', async () => {
    const tracker = new RequestLifecycleTracker({
      maxConcurrentRequests: 1,
      slowRequestThresholdMs: 1_000,
    });
    const app = express();
    let release!: () => void;
    let markEntered!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.use(tracker.middleware());
    app.get('/work', async (_request, response) => {
      markEntered();
      await blocked;
      response.json({ ok: true });
    });

    const first = request(app).get('/work');
    const firstResult = first.then((response) => response);
    await entered;

    const rejected = await request(app).get('/work').expect(503);
    expect(rejected.headers['retry-after']).toBe('1');
    expect(rejected.body.error.code).toBe('SERVER_BUSY');

    release();
    await firstResult;
    expect(tracker.getActiveRequests()).toBe(0);
  });

  it('rejects new work during shutdown and drains active requests', async () => {
    const tracker = new RequestLifecycleTracker({
      maxConcurrentRequests: 10,
      slowRequestThresholdMs: 1_000,
    });
    const app = express();
    app.use(tracker.middleware());
    app.get('/ok', (_request, response) => response.json({ ok: true }));

    tracker.beginShutdown();

    await request(app).get('/ok').expect(503);
    await expect(tracker.waitForDrain(100)).resolves.toBe(true);
  });
});
