import {
  defaultTableQuery,
  parseTableQuery,
  serializeTableQuery,
  type TableQuery,
  type TableSearchParams,
} from '@hims/ui';

/** Table state lives in the URL so a filtered/sorted page can be bookmarked and shared. */
export const PATIENT_TABLE_DEFAULTS: TableQuery = defaultTableQuery({ pageSize: 50 });
export const PATIENT_TABLE_OPTIONS = {
  sortable: ['mrn', 'name', 'ward', 'admittedAt', 'balance'],
  filterable: ['mrn', 'name', 'gender', 'ward', 'status'],
  pageSizes: [25, 50, 100, 500, 1000],
} as const;

export type TableMode = 'paged' | 'continuous';
export type DataTableSearch = TableSearchParams & { mode?: 'continuous' };

export function validateTableSearch(raw: Record<string, unknown>): DataTableSearch {
  const query = parseTableQuery(raw, PATIENT_TABLE_DEFAULTS, PATIENT_TABLE_OPTIONS);
  const flat = serializeTableQuery(query, PATIENT_TABLE_DEFAULTS);
  return raw.mode === 'continuous' ? { ...flat, mode: 'continuous' } : flat;
}

export function queryFromSearch(search: DataTableSearch): TableQuery {
  return parseTableQuery(search, PATIENT_TABLE_DEFAULTS, PATIENT_TABLE_OPTIONS);
}
