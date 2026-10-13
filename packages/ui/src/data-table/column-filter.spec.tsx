// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataTable, type DataTableColumn } from './data-table.js';
import { defaultTableQuery, type TableQuery } from './query-state.js';

afterEach(cleanup);

const columns: DataTableColumn<{ id: string }>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.id, filter: { kind: 'text' } },
];

function Host({ onQuery }: { onQuery: (q: TableQuery) => void }) {
  const [query, setQuery] = useState(defaultTableQuery());
  return (
    <DataTable
      caption="T"
      columns={columns}
      rows={[]}
      total={0}
      getRowId={(r) => r.id}
      query={query}
      onQueryChange={(q) => {
        onQuery(q);
        setQuery(q);
      }}
      status="success"
    />
  );
}

describe('column text filter', () => {
  it('keeps the space typed before a pause ("Ali " + "Khan" stays "Ali Khan")', async () => {
    const seen: TableQuery[] = [];
    const user = userEvent.setup();
    render(<Host onQuery={(q) => seen.push(q)} />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Filter by Name' });
    await user.type(input, 'Ali ');
    await act(() => new Promise<void>((r) => setTimeout(r, 400))); // debounce commits "Ali "
    await user.type(input, 'Khan');
    expect(input.value).toBe('Ali Khan');
    await act(() => new Promise<void>((r) => setTimeout(r, 400)));
    expect(input.value).toBe('Ali Khan');
    expect(seen.at(-1)?.filters.name?.trim()).toBe('Ali Khan');
  });
});
