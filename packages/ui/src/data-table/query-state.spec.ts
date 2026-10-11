import { describe, expect, it } from 'vitest';

import {
  defaultTableQuery,
  parseTableQuery,
  serializeTableQuery,
  setFilter,
  setPage,
  setPageSize,
  tableQueryKey,
  toggleSort,
} from './query-state.js';

const defaults = defaultTableQuery({ pageSize: 50 });
const options = { sortable: ['name', 'mrn'], filterable: ['status'], pageSizes: [25, 50, 100] };

describe('table query transitions', () => {
  it('cycles sort asc → desc → none and returns to page 1 each time', () => {
    const q0 = { ...defaults, page: 4 };
    const q1 = toggleSort(q0, 'name');
    expect(q1).toMatchObject({ sort: { id: 'name', desc: false }, page: 0 });
    const q2 = toggleSort({ ...q1, page: 3 }, 'name');
    expect(q2).toMatchObject({ sort: { id: 'name', desc: true }, page: 0 });
    expect(toggleSort(q2, 'name').sort).toBeNull();
  });

  it('switching to another column starts ascending', () => {
    const q = toggleSort(toggleSort(defaults, 'name'), 'mrn');
    expect(q.sort).toEqual({ id: 'mrn', desc: false });
  });

  it('removes blank filters and resets paging when a filter changes', () => {
    const withFilter = setFilter({ ...defaults, page: 7 }, 'status', ' active ');
    expect(withFilter).toMatchObject({ filters: { status: 'active' }, page: 0 });
    expect(setFilter(withFilter, 'status', '   ').filters).toEqual({});
  });

  it('clamps page to the available range', () => {
    expect(setPage(defaults, 99, 120).page).toBe(2);
    expect(setPage(defaults, -3, 120).page).toBe(0);
    expect(setPage(defaults, 5, 0).page).toBe(0);
  });

  it('keeps the first visible row when page size changes', () => {
    // Page 3 at 50/page starts at row 150 → at 100/page that row is on page index 1.
    expect(setPageSize({ ...defaults, page: 3 }, 100).page).toBe(1);
    expect(setPageSize({ ...defaults, page: 3 }, 25).page).toBe(6);
  });
});

describe('URL round trip', () => {
  it('serialises only non-default values and parses them back', () => {
    const q = {
      ...defaults,
      page: 2,
      pageSize: 100,
      sort: { id: 'mrn', desc: true },
      search: 'ali',
      filters: { status: 'active' },
    };
    const params = serializeTableQuery(q, defaults);
    expect(params).toEqual({
      page: '3',
      size: '100',
      sort: '-mrn',
      q: 'ali',
      'f.status': 'active',
    });
    expect(parseTableQuery(params, defaults, options)).toEqual(q);
    expect(serializeTableQuery(defaults, defaults)).toEqual({});
  });

  it('ignores tampered params instead of passing them to the server', () => {
    const parsed = parseTableQuery(
      { page: '0', size: '1000000', sort: 'password', 'f.cnic': '35202', q: 42 },
      defaults,
      options,
    );
    expect(parsed).toEqual({ ...defaults, search: '42' });
  });

  it('produces the same key regardless of filter insertion order', () => {
    const a = { ...defaults, filters: { a: '1', b: '2' } };
    const b = { ...defaults, filters: { b: '2', a: '1' } };
    expect(tableQueryKey(a)).toBe(tableQueryKey(b));
  });
});
