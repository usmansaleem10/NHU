import { describe, expect, it } from 'vitest';

import {
  defaultTableQuery,
  parseTableQuery,
  serializeTableQuery,
  setFilter,
  setPage,
  sensitivePart,
  setPageSize,
  tableQueryKey,
  toggleSort,
  toRequestQuery,
  withSensitive,
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

  it('keeps what the user typed, removes blank filters and resets paging', () => {
    // Untrimmed in state: trimming here would fight the input still being typed ("Ali |").
    const withFilter = setFilter({ ...defaults, page: 7 }, 'name', 'Ali ');
    expect(withFilter).toMatchObject({ filters: { name: 'Ali ' }, page: 0 });
    expect(setFilter(withFilter, 'name', '   ').filters).toEqual({});
  });

  it('trims search and filters only when building the server request', () => {
    const q = { ...defaults, search: '  ayesha ', filters: { name: 'Ali ', ward: ' ICU' } };
    expect(toRequestQuery(q)).toEqual({
      ...q,
      search: 'ayesha',
      filters: { name: 'Ali', ward: 'ICU' },
    });
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
  // Reference lists with no personal data may put search and filters in the URL.
  const open = { search: true, filters: ['status'] };

  it('serialises only non-default values and parses them back', () => {
    const q = {
      ...defaults,
      page: 2,
      pageSize: 100,
      sort: { id: 'mrn', desc: true },
      search: 'ali',
      filters: { status: 'active' },
    };
    const params = serializeTableQuery(q, defaults, open);
    expect(params).toEqual({
      page: '3',
      size: '100',
      sort: '-mrn',
      q: 'ali',
      'f.status': 'active',
    });
    expect(parseTableQuery(params, defaults, { ...options, url: open })).toEqual(q);
    expect(serializeTableQuery(defaults, defaults, open)).toEqual({});
  });

  it('ignores tampered params instead of passing them to the server', () => {
    const parsed = parseTableQuery(
      { page: '0', size: '1000000', sort: 'password', 'f.cnic': '35202', q: 42 },
      defaults,
      { ...options, url: open },
    );
    expect(parsed).toEqual({ ...defaults, search: '42' });
  });

  it('produces the same key regardless of filter insertion order', () => {
    const a = { ...defaults, filters: { a: '1', b: '2' } };
    const b = { ...defaults, filters: { b: '2', a: '1' } };
    expect(tableQueryKey(a)).toBe(tableQueryKey(b));
  });
});

describe('personal data stays out of the URL', () => {
  // Patient list: name/MRN filters and free-text search can identify a patient.
  const policy = { search: false, filters: ['status'] };
  const q = {
    ...defaults,
    sort: { id: 'name', desc: false },
    search: 'Ayesha Khan',
    filters: { status: 'active', name: 'Ayesha', mrn: 'MR-000123' },
  };

  it('serialises only sort/page/size and the url-safe filters', () => {
    expect(serializeTableQuery(q, defaults, policy)).toEqual({
      sort: 'name',
      'f.status': 'active',
    });
  });

  it('refuses personal params arriving in a URL (e.g. an old shared link)', () => {
    const parsed = parseTableQuery(
      { q: 'Ayesha', 'f.name': 'Ayesha', 'f.status': 'active' },
      defaults,
      {
        ...options,
        filterable: ['status', 'name'],
        url: policy,
      },
    );
    expect(parsed).toEqual({ ...defaults, filters: { status: 'active' } });
  });

  it('splits off the sensitive part to keep in memory and merges it back', () => {
    const sensitive = sensitivePart(q, policy);
    expect(sensitive).toEqual({
      search: 'Ayesha Khan',
      filters: { name: 'Ayesha', mrn: 'MR-000123' },
    });
    const fromUrl = parseTableQuery(serializeTableQuery(q, defaults, policy), defaults, {
      ...options,
      sortable: ['name'],
      url: policy,
    });
    expect(withSensitive(fromUrl, sensitive)).toEqual(q);
  });
});
