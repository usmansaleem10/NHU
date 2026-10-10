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

  it('propagates a caller-supplied x-request-id', async () => {
    const response = await inject({ 'x-request-id': 'gateway-42' });

    expect(response.headers['x-request-id']).toBe('gateway-42');
    expect(logsFor('gateway-42')).not.toHaveLength(0);
  });

  it('never logs credential headers', async () => {
    await inject({ authorization: 'Bearer leaked.jwt', cookie: 'sid=leaked-session' });

    const logged = lines.join('');
    expect(logged).not.toContain('leaked.jwt');
    expect(logged).not.toContain('leaked-session');
  });
});
