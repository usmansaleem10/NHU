import type { Story } from '@ladle/react';
import { useEffect, useState } from 'react';

import { Badge } from '../components/display.js';
import { DataTable, type DataTableColumn } from './data-table.js';
import { defaultTableQuery, type DataPage, type TableQuery } from './query-state.js';
import { TableSearch } from './toolbar.js';

export default { title: 'Data table' };

interface Row {
  id: string;
  name: string;
  ward: string;
  status: 'active' | 'discharged';
}

// Story fixture: a fake "server" over 10k generated rows.
const ALL: Row[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: String(i + 1),
  name: `Demo patient ${String(i + 1).padStart(5, '0')}`,
  ward: ['A', 'B', 'C', 'ICU'][i % 4] ?? 'A',
  status: i % 7 === 0 ? 'discharged' : 'active',
}));

function serve(q: TableQuery): DataPage<Row> {
  let rows = ALL.filter((r) => r.name.toLowerCase().includes(q.search.toLowerCase()));
  const status = q.filters.status;
  if (status) rows = rows.filter((r) => r.status === status);
  if (q.sort) {
    const { id, desc } = q.sort;
    rows = [...rows].sort(
      (a, b) => a[id as keyof Row].localeCompare(b[id as keyof Row]) * (desc ? -1 : 1),
    );
  }
  return { rows: rows.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize), total: rows.length };
}

const columns: DataTableColumn<Row>[] = [
  { id: 'id', header: 'ID', cell: (r) => r.id, width: 80, align: 'end', hideable: false },
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
  { id: 'ward', header: 'Ward', cell: (r) => r.ward, sortable: true, width: 100 },
  {
    id: 'status',
    header: 'Status',
    width: 140,
    cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>{r.status}</Badge>,
    filter: {
      kind: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'discharged', label: 'Discharged' },
      ],
    },
  },
];

export const ServerPaged: Story = () => {
  const [query, setQuery] = useState(defaultTableQuery({ pageSize: 1000 }));
  const [page, setPage] = useState<DataPage<Row> | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(serve(query));
    }, 150);
    return () => {
      clearTimeout(id);
    };
  }, [query]);
  return (
    <DataTable
      caption="Patients"
      columns={columns}
      rows={page?.rows ?? []}
      total={page?.total ?? 0}
      getRowId={(r) => r.id}
      query={query}
      onQueryChange={setQuery}
      status={page ? 'success' : 'pending'}
      toolbar={
        <TableSearch
          label="Search patients"
          value={query.search}
          onChange={(search) => {
            setQuery({ ...query, search, page: 0 });
          }}
        />
      }
    />
  );
};

export const Empty: Story = () => (
  <DataTable
    caption="Empty"
    columns={columns}
    rows={[]}
    total={0}
    getRowId={(r) => r.id}
    query={defaultTableQuery()}
    onQueryChange={() => undefined}
    status="success"
  />
);

export const LoadError: Story = () => (
  <DataTable
    caption="Error"
    columns={columns}
    rows={[]}
    total={0}
    getRowId={(r) => r.id}
    query={defaultTableQuery()}
    onQueryChange={() => undefined}
    status="error"
    onRetry={() => undefined}
  />
);
