import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadEnv } from './config/env';
import { createApp } from './create-app';

// nestjs-pino keeps one root logger per process, so the whole file shares one app and sink.
const lines: string[] = [];
let app: NestFastifyApplication;

beforeAll(async () => {
  app = await createApp(loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'info' }), {
    logDestination: { write: (line: string) => lines.push(line) },
  });
  await app.init();
});

afterAll(async () => {
  await app.close();
});

function inject(headers: Record<string, string> = {}) {
  return app.getHttpAdapter().getInstance().inject({
    method: 'GET',
    url: '/api/v1/unknown-route',
    headers,
  });
}

function logsFor(requestId: string) {
  return lines
    .map((line) => JSON.parse(line) as { req?: { id?: string }; msg?: string })
    .filter((record) => record.req?.id === requestId);
}

describe('createApp request ids', () => {
  it('generates a request id, returns it in x-request-id and logs it', async () => {
    const response = await inject();

    const requestId = response.headers['x-request-id'];
    expect(typeof requestId).toBe('string');
    expect(logsFor(String(requestId))).toContainEqual(
      expect.objectContaining({ msg: 'request completed' }),
    );
  });

  it('mints its own id by default and logs the caller-supplied one as upstreamRequestId', async () => {
    const response = await inject({ 'x-request-id': 'gateway-42' });

    const requestId = String(response.headers['x-request-id']);
    expect(requestId).not.toBe('gateway-42');
    expect(logsFor(requestId)).toContainEqual(
      expect.objectContaining({ upstreamRequestId: 'gateway-42' }),
    );
  });

  it('propagates x-request-id only when TRUST_PROXY_REQUEST_ID=true', async () => {
    const trusted = await createApp(
      loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent', TRUST_PROXY_REQUEST_ID: 'true' }),
    );
    await trusted.init();
    try {
      const response = await trusted.inject({
        method: 'GET',
        url: '/api/v1/unknown-route',
        headers: { 'x-request-id': 'gateway-42' },
      });
      expect(response.headers['x-request-id']).toBe('gateway-42');
    } finally {
      await trusted.close();
    }
  });

  it('keeps query-string PII out of request logs', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/unknown-route?cnic=35202-1234567-1&phone=03001234567',
    });

    const logged = JSON.stringify(logsFor(String(response.headers['x-request-id'])));
    expect(logged).toContain('/api/v1/unknown-route');
    expect(logged).not.toContain('35202-1234567-1');
    expect(logged).not.toContain('03001234567');
  });

  it('still logs routes that merely start with "health"', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/health-records?x=1',
    });

    expect(logsFor(String(response.headers['x-request-id']))).not.toHaveLength(0);
  });

  it('does not auto-log orchestrator health probes', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    expect(logsFor(String(response.headers['x-request-id']))).toHaveLength(0);
    const ready = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/health/ready?probe=k8s',
    });
    expect(logsFor(String(ready.headers['x-request-id']))).toHaveLength(0);
  });

  it('never logs credential headers', async () => {
    await inject({ authorization: 'Bearer leaked.jwt', cookie: 'sid=leaked-session' });

    const logged = lines.join('');
    expect(logged).not.toContain('leaked.jwt');
    expect(logged).not.toContain('leaked-session');
  });
});
