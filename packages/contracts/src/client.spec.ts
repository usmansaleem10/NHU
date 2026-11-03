import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ApiClient } from './client.js';
import { ApiProblemError, createApiClient } from './client.js';

function fakeFetch(status: number, body: unknown, contentType = 'application/json') {
  const requests: Request[] = [];
  const fetch = (request: Request) => {
    requests.push(request);
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } }),
    );
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

describe('createApiClient', () => {
  it('calls the versioned route from the contract and returns the typed body', async () => {
    const { fetch, requests } = fakeFetch(200, { apiVersion: 'v1', release: 'abc123' });
    const client = createApiClient({ baseUrl: 'https://demo-a.hims.test', fetch });

    const version = await client.meta.version();

    expect(version).toEqual({ apiVersion: 'v1', release: 'abc123' });
    expect(requests[0]?.method).toBe('GET');
    expect(requests[0]?.url).toBe('https://demo-a.hims.test/api/v1/meta/version');
  });

  it('keeps a path prefix on the base URL', async () => {
    const { fetch, requests } = fakeFetch(200, { apiVersion: 'v1', release: 'dev' });

    await createApiClient({ baseUrl: 'https://gw.hims.test/hims', fetch }).meta.version();

    expect(requests[0]?.url).toBe('https://gw.hims.test/hims/api/v1/meta/version');
  });

  it('throws ApiProblemError carrying the parsed problem+json body', async () => {
    const problem = {
      type: 'urn:hims:problem:unavailable',
      title: 'Service unavailable',
      status: 503,
      code: 'health.not_ready',
      requestId: 'r-1',
    };
    const { fetch } = fakeFetch(503, problem, 'application/problem+json');
    const client = createApiClient({ baseUrl: 'https://demo-a.hims.test', fetch });

    const error: unknown = await client.meta.version().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiProblemError);
    expect((error as ApiProblemError).problem).toEqual(problem);
    expect((error as ApiProblemError).status).toBe(503);
  });

  it('types every procedure from the contract (a renamed field fails typecheck)', () => {
    // Compile-time assertions: `pnpm typecheck` covers specs, so changing a contract field
    // without updating consumers breaks the build here and in every consumer.
    expectTypeOf<Awaited<ReturnType<ApiClient['meta']['version']>>>().toEqualTypeOf<{
      apiVersion: 'v1';
      release: string;
    }>();
  });
});
