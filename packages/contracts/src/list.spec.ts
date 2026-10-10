import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, listQuery, listResponse, MAX_PAGE_SIZE, rangeFilter } from './list.js';

const patientsQuery = listQuery({
  sortable: ['createdAt', 'name'],
  defaultSort: '-createdAt',
  filters: {
    status: z.enum(['active', 'inactive']),
    createdAt: rangeFilter(z.iso.datetime()),
  },
});

describe('listQuery', () => {
  it('applies the default page size and sort', () => {
    expect(patientsQuery.parse({})).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      sort: [{ field: 'createdAt', direction: 'desc' }],
    });
  });

  it('coerces limit from the query string', () => {
    expect(patientsQuery.parse({ limit: '50' }).limit).toBe(50);
  });

  it(`accepts exactly the max page size (${String(MAX_PAGE_SIZE)})`, () => {
    expect(patientsQuery.parse({ limit: String(MAX_PAGE_SIZE) }).limit).toBe(MAX_PAGE_SIZE);
  });

  it.each(['101', '1000', '0', '-5', '2.5', 'ten'])('rejects limit=%s', (limit) => {
    expect(patientsQuery.safeParse({ limit }).success).toBe(false);
  });

  it('honours a smaller per-endpoint maximum', () => {
    const small = listQuery({
      sortable: ['name'],
      defaultSort: 'name',
      filters: {},
      maxPageSize: 10,
    });
    expect(small.safeParse({ limit: '11' }).success).toBe(false);
  });

  it('parses multi-field sort with directions', () => {
    expect(patientsQuery.parse({ sort: 'name,-createdAt' }).sort).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'createdAt', direction: 'desc' },
    ]);
  });

  it.each([
    ['a field outside the allow-list', 'cnic'],
    ['a duplicated field', 'name,-name'],
    ['an empty segment', 'name,,createdAt'],
    ['an empty value', ''],
  ])('rejects sort with %s', (_case, sort) => {
    const result = patientsQuery.safeParse({ sort });
    expect(result.success).toBe(false);
  });

  it('names the offending sort field in the issue', () => {
    const result = patientsQuery.safeParse({ sort: 'cnic' });
    expect(result.error?.issues[0]).toMatchObject({ path: ['sort'] });
    expect(result.error?.issues[0]?.message).toContain('cnic');
  });

  it('accepts allow-listed filters, including ranges', () => {
    expect(
      patientsQuery.parse({
        filter: { status: 'active', createdAt: { gte: '2026-01-01T00:00:00Z' } },
      }).filter,
    ).toEqual({ status: 'active', createdAt: { gte: '2026-01-01T00:00:00Z' } });
  });

  it.each([
    ['an unknown filter field', { cnic: '35202' }],
    ['an invalid filter value', { status: 'deleted' }],
    ['an unknown range operator', { createdAt: { ne: '2026-01-01T00:00:00Z' } }],
  ])('rejects %s', (_case, filter) => {
    expect(patientsQuery.safeParse({ filter }).success).toBe(false);
  });

  it('bounds the opaque cursor length', () => {
    expect(patientsQuery.safeParse({ cursor: 'x'.repeat(2049) }).success).toBe(false);
  });
});

describe('listResponse', () => {
  it('describes the standard list envelope', () => {
    const schema = listResponse(z.object({ id: z.string() }));

    expect(
      schema.parse({ items: [{ id: 'a' }], page: { limit: 25, hasMore: false, nextCursor: null } }),
    ).toEqual({ items: [{ id: 'a' }], page: { limit: 25, hasMore: false, nextCursor: null } });
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });
});
