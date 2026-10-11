import type { SortTerm } from '@hims/contracts';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-error';
import { CursorCodec } from './cursor';
import type { CursorValue, KeysetPredicate, PageRequest } from './keyset';
import { keysetPredicate, listPage, toKeysetSort } from './keyset';

interface Row {
  id: string;
  createdAt: string;
  name: string;
}

type Field = 'createdAt' | 'name';

const context = {
  codec: new CursorCodec('test-secret-test-secret-test-secret'),
  resource: 'patients',
  scope: { tenantId: 'tenant-a', userId: 'user-1' },
};

// Postgres-like timestamptz comparison: microsecond precision, whatever the text format.
function toMicros(value: string): bigint {
  const match = /^(.{19})(?:\.(\d{1,6}))?(.*)$/.exec(value.replace('T', ' '));
  if (!match) throw new Error(`not a timestamp: ${value}`);
  const [, seconds = '', fraction = '', zone = ''] = match;
  const offset = zone === 'Z' || zone === '' ? '+00:00' : zone.length === 3 ? `${zone}:00` : zone;
  const millis = Date.parse(`${seconds.replace(' ', 'T')}${offset}`);
  return BigInt(millis) * 1000n + BigInt(fraction.padEnd(6, '0'));
}

function compareField(field: keyof Row, a: CursorValue, b: CursorValue): number {
  if (field === 'createdAt' && typeof a === 'string' && typeof b === 'string') {
    const [x, y] = [toMicros(a), toMicros(b)];
    return x === y ? 0 : x < y ? -1 : 1;
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Reference evaluator: what a repository must do with a PageRequest (SQL does this for real). */
function matches(row: Row, predicate: KeysetPredicate<keyof Row> | undefined): boolean {
  if (!predicate) return true;
  return predicate.anyOf.some((conditions) =>
    conditions.every(({ field, op, value }) => {
      const order = compareField(field, row[field], value);
      return op === 'eq' ? order === 0 : op === 'gt' ? order > 0 : order < 0;
    }),
  );
}

function fakeTable(rows: Row[]) {
  return {
    rows,
    findPage(request: PageRequest<keyof Row, undefined>): Promise<Row[]> {
      const sorted = rows
        .filter((row) => matches(row, request.after))
        .sort((a, b) => {
          for (const { field, direction } of request.sort) {
            const order = compareField(field, a[field], b[field]);
            if (order !== 0) return direction === 'asc' ? order : -order;
          }
          return 0;
        });
      return Promise.resolve(sorted.slice(0, request.fetchLimit));
    },
  };
}

const keyOf = (sort: readonly SortTerm<keyof Row>[]) => (row: Row) =>
  sort.map(({ field }) => row[field]);

async function readAll(
  table: ReturnType<typeof fakeTable>,
  sort: SortTerm<Field>[],
  limit: number,
  between?: (pageIndex: number) => void,
) {
  const seen: string[] = [];
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < 50; pageIndex++) {
    const page = await listPage(table, { limit, sort, cursor }, context, keyOf);
    seen.push(...page.items.map((row) => row.id));
    between?.(pageIndex);
    if (!page.page.hasMore) {
      expect(page.page.nextCursor).toBeNull();
      return seen;
    }
    cursor = page.page.nextCursor ?? undefined;
  }
  throw new Error('pagination did not terminate');
}

function row(id: string, createdAt: string, name = id): Row {
  return { id, createdAt, name };
}

describe('toKeysetSort', () => {
  it('appends the unique id as tie-breaker', () => {
    expect(toKeysetSort([{ field: 'createdAt', direction: 'desc' }])).toEqual([
      { field: 'createdAt', direction: 'desc' },
      { field: 'id', direction: 'asc' },
    ]);
  });

  it('does not duplicate an explicit id term', () => {
    expect(toKeysetSort([{ field: 'id', direction: 'desc' }])).toEqual([
      { field: 'id', direction: 'desc' },
    ]);
  });
});

describe('keysetPredicate', () => {
  it('expands mixed directions into an OR of ANDs (row-value comparison)', () => {
    expect(
      keysetPredicate(
        [
          { field: 'createdAt', direction: 'desc' },
          { field: 'name', direction: 'asc' },
          { field: 'id', direction: 'asc' },
        ],
        ['2026-10-01', 'Ali', 'p-3'],
      ),
    ).toEqual({
      anyOf: [
        [{ field: 'createdAt', op: 'lt', value: '2026-10-01' }],
        [
          { field: 'createdAt', op: 'eq', value: '2026-10-01' },
          { field: 'name', op: 'gt', value: 'Ali' },
        ],
        [
          { field: 'createdAt', op: 'eq', value: '2026-10-01' },
          { field: 'name', op: 'eq', value: 'Ali' },
          { field: 'id', op: 'gt', value: 'p-3' },
        ],
      ],
    });
  });

  it('rejects a key whose arity does not match the sort', () => {
    expect(() => keysetPredicate([{ field: 'id', direction: 'asc' }], ['a', 'b'])).toThrow(
      ValidationError,
    );
  });
});

describe('listPage', () => {
  const T = '2026-10-01T08:00:00.000Z';
  const seed = () => [
    row('p-1', '2026-10-01T09:00:00.000Z'),
    row('p-2', T),
    row('p-3', T),
    row('p-4', T),
    row('p-5', T),
    row('p-6', '2026-10-01T07:00:00.000Z'),
    row('p-7', '2026-10-01T06:00:00.000Z'),
  ];
  const newestFirst: SortTerm<Field>[] = [{ field: 'createdAt', direction: 'desc' }];

  it('pages through ties on the sort column without skips or repeats', async () => {
    const table = fakeTable(seed());

    expect(await readAll(table, newestFirst, 2)).toEqual([
      'p-1',
      'p-2',
      'p-3',
      'p-4',
      'p-5',
      'p-6',
      'p-7',
    ]);
  });

  it('stays stable when rows are inserted before and after the cursor between pages', async () => {
    const table = fakeTable(seed());

    const seen = await readAll(table, newestFirst, 3, (pageIndex) => {
      if (pageIndex !== 0) return;
      // Newer than everything already read: must not shift later pages.
      table.rows.push(row('p-new-top', '2026-10-02T00:00:00.000Z'));
      // Ties with the cursor row, sorting before it by id: already "passed".
      table.rows.push(row('p-0', T));
      // Ahead of the cursor: must be picked up exactly once.
      table.rows.push(row('p-8', '2026-10-01T05:00:00.000Z'));
    });

    expect(seen).toEqual(['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8']);
  });

  it('reports the requested limit and fetches one extra row to detect more pages', async () => {
    const requests: PageRequest<keyof Row, undefined>[] = [];
    const table = fakeTable(seed());
    const spy = {
      findPage: (request: PageRequest<keyof Row, undefined>) => {
        requests.push(request);
        return table.findPage(request);
      },
    };

    const page = await listPage(spy, { limit: 7, sort: newestFirst }, context, keyOf);

    expect(requests[0]?.fetchLimit).toBe(8);
    expect(page.items).toHaveLength(7);
    expect(page.page).toEqual({ limit: 7, hasMore: false, nextCursor: null });
  });

  it('rejects a cursor from a differently sorted listing', async () => {
    const table = fakeTable(seed());
    const first = await listPage(table, { limit: 2, sort: newestFirst }, context, keyOf);

    await expect(
      listPage(
        table,
        {
          limit: 2,
          sort: [{ field: 'name', direction: 'asc' }],
          cursor: first.page.nextCursor ?? '',
        },
        context,
        keyOf,
      ),
    ).rejects.toMatchObject({ code: 'list.cursor_invalid' });
  });

  it('pages correctly through microsecond timestamps when keys are the DB text', async () => {
    // Same millisecond, different microseconds: a JS Date (ms) key would repeat or skip rows.
    const table = fakeTable([
      row('p-1', '2026-10-01 08:00:00.123999+00'),
      row('p-2', '2026-10-01 08:00:00.123456+00'),
      row('p-3', '2026-10-01 08:00:00.123001+00'),
      row('p-4', '2026-10-01 08:00:00.122+00'),
    ]);

    expect(await readAll(table, newestFirst, 1)).toEqual(['p-1', 'p-2', 'p-3', 'p-4']);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a Date (ms precision)', new Date('2026-10-01T08:00:00.123Z')],
    ['NaN', Number.NaN],
  ])('refuses to build a cursor from a %s key value', async (_case, bad) => {
    const table = fakeTable(seed());
    const badKeyOf = () => () => [bad, 'p-1'] as unknown as CursorValue[];

    await expect(
      listPage(table, { limit: 1, sort: newestFirst }, context, badKeyOf),
    ).rejects.toThrow(/key value/);
  });
});
