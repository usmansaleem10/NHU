import { Controller, Module } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { oc } from '@orpc/contract';
import { Implement, implement } from '@orpc/nest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { loadEnv } from '../config/env';
import { createApp } from '../create-app';
import { NotFoundError } from '../errors/domain-error';

// A test-only contract exercising validation and error paths end to end.
const probe = {
  items: oc
    .route({ method: 'GET', path: '/probe/items' })
    .input(z.object({ limit: z.coerce.number().int().max(100) }))
    .output(z.object({ count: z.number() })),
  missing: oc.route({ method: 'GET', path: '/probe/missing' }).output(z.object({})),
  crash: oc.route({ method: 'GET', path: '/probe/crash' }).output(z.object({})),
  badOutput: oc
    .route({ method: 'GET', path: '/probe/bad-output' })
    .output(z.object({ n: z.number() })),
};

@Controller()
class ProbeController {
  @Implement(probe.items)
  items() {
    return implement(probe.items).handler(({ input }) => ({ count: input.limit }));
  }

  @Implement(probe.missing)
  missing() {
    return implement(probe.missing).handler(() => {
      throw new NotFoundError('patient.not_found', 'Patient not found');
    });
  }

  @Implement(probe.crash)
  crash() {
    return implement(probe.crash).handler(() => {
      throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
    });
  }

  @Implement(probe.badOutput)
  badOutput() {
    return implement(probe.badOutput).handler(
      () => ({ n: 'not-a-number' }) as unknown as { n: number },
    );
  }
}

@Module({ controllers: [ProbeController] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
class ProbeModule {}

const logs: string[] = [];
let app: NestFastifyApplication;

beforeAll(async () => {
  app = await createApp(loadEnv({ NODE_ENV: 'test', APP_RELEASE: 'sha-abc123' }), {
    imports: [ProbeModule],
    logDestination: { write: (line: string) => logs.push(line) },
  });
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('contract-implemented routes', () => {
  it('serves GET /api/v1/meta/version from the shared contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/meta/version' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ apiVersion: 'v1', release: 'sha-abc123' });
  });

  it('validates input against the contract', async () => {
    const ok = await app.inject({ method: 'GET', url: '/api/v1/probe/items?limit=20' });
    expect(ok.json()).toEqual({ count: 20 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/items?limit=500',
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toMatchObject({
      type: 'urn:hims:problem:validation',
      code: 'request.invalid',
      requestId: response.headers['x-request-id'],
      errors: [{ path: 'limit' }],
    });
  });

  it('maps DomainErrors thrown by contract handlers to problem+json', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/probe/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toMatchObject({ code: 'patient.not_found', status: 404 });
  });

  it('hides unexpected handler failures and logs them with the request id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/crash',
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('ECONNREFUSED');
    const errorLog = logs
      .map((line) => JSON.parse(line) as { level: number; req?: { id?: string }; err?: unknown })
      .find((record) => record.level >= 50 && record.req?.id === response.headers['x-request-id']);
    expect(JSON.stringify(errorLog?.err)).toContain('ECONNREFUSED');
  });

  it('refuses to send a response that breaks the contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/probe/bad-output' });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('not-a-number');
  });
});

describe('OpenAPI docs', () => {
  it('serves the OpenAPI document generated from the contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });

    expect(response.statusCode).toBe(200);
    const document = response.json<{
      openapi: string;
      servers: { url: string }[];
      paths: Record<string, Record<string, unknown>>;
    }>();
    expect(document.openapi).toMatch(/^3\./);
    expect(document.servers).toEqual([{ url: '/api/v1' }]);
    expect(document.paths['/meta/version']).toHaveProperty('get');
  });

  it('serves the interactive reference page', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/docs' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.body).toContain('/api/docs/openapi.json');
  });
});
