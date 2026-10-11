import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadEnv } from '../config/env';
import { createApp } from '../create-app';
import { ReadinessRegistry } from './readiness.registry';

let app: NestFastifyApplication;
let redisUp = true;

beforeAll(async () => {
  app = await createApp(
    loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent', READINESS_CACHE_MS: '0' }),
  );
  // What the DB/infra modules will do in onModuleInit for Postgres and Redis.
  app.get(ReadinessRegistry).register({
    name: 'redis',
    check: () => (redisUp ? Promise.resolve() : Promise.reject(new Error('redis down'))),
  });
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('health endpoints', () => {
  it('GET /api/v1/health answers liveness without touching dependencies', async () => {
    redisUp = false;

    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/health/ready is 200 when every check passes', async () => {
    redisUp = true;

    const response = await app.inject({ method: 'GET', url: '/api/v1/health/ready' });

    expect(response.statusCode).toBe(200);
    // Dependency names and timings are logged, never published.
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/health/ready is a 503 problem that does not reveal dependencies', async () => {
    redisUp = false;

    const response = await app.inject({ method: 'GET', url: '/api/v1/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toMatchObject({
      type: 'urn:hims:problem:unavailable',
      code: 'health.not_ready',
    });
    expect(response.body).not.toContain('redis');
  });
});
