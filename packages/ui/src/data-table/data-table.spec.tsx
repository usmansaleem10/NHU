// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableColumn } from './data-table.js';
import { defaultTableQuery, type TableQuery } from './query-state.js';

afterEach(cleanup);

interface Row {
  id: string;
}
const columns: DataTableColumn<Row>[] = [
  { id: 'id', header: 'ID', cell: (r) => r.id, filter: { kind: 'text' } },
];

function renderTable(query: TableQuery, total: number, onQueryChange = vi.fn()) {
  render(
    <DataTable<Row>
      caption="Rows"
      columns={columns}
      rows={[]}
      total={total}
      getRowId={(r) => r.id}
      query={query}
      onQueryChange={onQueryChange}
      status="success"
    />,
  );
  return onQueryChange;
}

describe('DataTable', () => {
  it('moves back to the last page when a refreshed total no longer reaches the current page', () => {
    // e.g. a stale bookmark (?page=51) or rows deleted since: page 50 of a 2-page result.
    const onQueryChange = renderTable({ ...defaultTableQuery({ pageSize: 50 }), page: 50 }, 100);
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('leaves a valid page alone', () => {
    const onQueryChange = renderTable({ ...defaultTableQuery({ pageSize: 50 }), page: 1 }, 100);
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('counts both header rows (titles + filters) in aria-rowcount', () => {
    renderTable(defaultTableQuery(), 10);
    const table = screen.getByRole('table', { name: 'Rows' });
    expect(table.getAttribute('aria-rowcount')).toBe('12');
    const headerRows = table.querySelectorAll('thead tr');
    expect([...headerRows].map((r) => r.getAttribute('aria-rowindex'))).toEqual(['1', '2']);
  });

  it('makes the scrolling viewport a labelled, keyboard-focusable region', () => {
    renderTable(defaultTableQuery(), 10);
    const region = screen.getByRole('region', { name: 'Rows' });
    expect(region.tabIndex).toBe(0);
  });
});
