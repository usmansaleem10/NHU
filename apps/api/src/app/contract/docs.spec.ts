import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../config/env';
import { createApp } from '../create-app';
import { DocsController, SCALAR_INTEGRITY, SCALAR_SCRIPT_URL } from './docs.controller';
import type { OpenApiGenerator } from './openapi';
import { generateOpenApiDocument } from './openapi';

let app: NestFastifyApplication | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  await app?.close();
  app = undefined;
});

async function start(env: Record<string, string>) {
  app = await createApp(loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...env }));
  await app.init();
  return app;
}

describe('API docs', () => {
  it('are not served unless API_DOCS_ENABLED=true, whatever NODE_ENV says', async () => {
    const server = await start({ NODE_ENV: 'development' });

    expect((await server.inject({ method: 'GET', url: '/api/docs' })).statusCode).toBe(404);
    expect((await server.inject({ method: 'GET', url: '/api/docs/openapi.json' })).statusCode).toBe(
      404,
    );
  });

  it('serve the reference page with SRI, a strict CSP and nosniff when enabled', async () => {
    const server = await start({ API_DOCS_ENABLED: 'true' });

    const response = await server.inject({ method: 'GET', url: '/api/docs' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(`src="${SCALAR_SCRIPT_URL}"`);
    expect(response.body).toContain(`integrity="${SCALAR_INTEGRITY}"`);
    expect(response.body).toContain('crossorigin="anonymous"');
    const csp = String(response.headers['content-security-policy']);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain(`script-src ${SCALAR_SCRIPT_URL}`);
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('serve the OpenAPI JSON with nosniff when enabled', async () => {
    const server = await start({ API_DOCS_ENABLED: 'true' });

    const response = await server.inject({ method: 'GET', url: '/api/docs/openapi.json' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('DocsController.openApi', () => {
  it('does not cache a failed generation', async () => {
    const generate = vi
      .fn<OpenApiGenerator>()
      .mockRejectedValueOnce(new Error('converter crashed'))
      .mockImplementation(generateOpenApiDocument);
    const controller = new DocsController(loadEnv({ NODE_ENV: 'test' }), generate);

    await expect(controller.openApi()).rejects.toThrow('converter crashed');
    const document = await controller.openApi();

    expect(document).toHaveProperty('openapi');
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
