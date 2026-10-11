import { listQuery, listResponse } from '@hims/contracts';
import { Controller, Module } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { oc } from '@orpc/contract';
import { Implement, implement } from '@orpc/nest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { loadEnv } from '../config/env';
import { createApp } from '../create-app';
import { CursorCodec } from './cursor';
import { listPage } from './keyset';

// End to end through the HTTP layer: contract query parsing -> listPage -> list envelope.
const rows = Array.from({ length: 5 }, (_, index) => ({
  id: `w-${String(index + 1)}`,
  name: `Ward ${String(index + 1)}`,
}));

const wards = oc
  .route({ method: 'GET', path: '/probe/wards' })
  .input(listQuery({ sortable: ['name'], defaultSort: 'name', filters: {} }))
  .output(listResponse(z.object({ id: z.string(), name: z.string() })));

@Controller()
class WardsProbeController {
  constructor(private readonly codec: CursorCodec) {}

  @Implement(wards)
  list() {
    return implement(wards).handler(({ input }) =>
      listPage(
        {
          findPage: ({ fetchLimit, after }) => {
            const start = after
              ? rows.findIndex((row) => row.id > String(after.anyOf.at(-1)?.at(-1)?.value))
              : 0;
            return Promise.resolve(start < 0 ? [] : rows.slice(start, start + fetchLimit));
          },
        },
        input,
        { codec: this.codec, resource: 'wards', scope: { tenantId: 'tenant-a', userId: null } },
        (sort) => (row) => sort.map(({ field }) => row[field]),
      ),
    );
  }
}

@Module({ controllers: [WardsProbeController] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest modules are decorator-only classes
class WardsProbeModule {}

let app: NestFastifyApplication;

beforeAll(async () => {
  app = await createApp(loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }), {
    imports: [WardsProbeModule],
  });
  await app.init();
});

afterAll(async () => {
  await app.close();
});

const get = (query: string) => app.inject({ method: 'GET', url: `/api/v1/probe/wards${query}` });

describe('list endpoint over HTTP', () => {
  it('pages with an opaque cursor', async () => {
    const first = await get('?limit=2');
    const { page } = first.json<{ page: { nextCursor: string; hasMore: boolean } }>();

    expect(page.hasMore).toBe(true);
    const second = await get(`?limit=2&cursor=${page.nextCursor}`);
    expect(second.json<{ items: { id: string }[] }>().items.map((row) => row.id)).toEqual([
      'w-3',
      'w-4',
    ]);
  });

  it.each([
    ['limit above the maximum', '?limit=101', 'limit'],
    ['oversized cursor', `?cursor=${'x'.repeat(2049)}`, 'cursor'],
    ['sort outside the allow-list', '?sort=cnic', 'sort'],
  ])('rejects %s with a 400 problem', async (_case, query, path) => {
    const response = await get(query);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'request.invalid', errors: [{ path }] });
  });

  it('rejects a forged cursor with list.cursor_invalid', async () => {
    const response = await get('?cursor=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'list.cursor_invalid' });
  });
});
