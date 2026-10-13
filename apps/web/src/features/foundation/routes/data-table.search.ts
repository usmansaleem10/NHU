import {
  defaultTableQuery,
  parseTableQuery,
  serializeTableQuery,
  type TableQuery,
  type TableSearchParams,
  type UrlPolicy,
} from '@hims/ui';

/** Non-personal table state lives in the URL so a sorted/filtered page can be bookmarked. */
export const PATIENT_TABLE_DEFAULTS: TableQuery = defaultTableQuery({ pageSize: 50 });
/**
 * Patient lists are personal data: free-text search and the MRN/name filters stay in memory;
 * only sort, paging and enum filters (gender, ward, status) go to the URL and saved views.
 */
export const PATIENT_URL_POLICY: UrlPolicy = {
  search: false,
  filters: ['gender', 'ward', 'status'],
};
export const PATIENT_TABLE_OPTIONS = {
  sortable: ['mrn', 'name', 'ward', 'admittedAt', 'balance'],
  filterable: ['mrn', 'name', 'gender', 'ward', 'status'],
  pageSizes: [25, 50, 100, 500, 1000],
  url: PATIENT_URL_POLICY,
} as const;

export type TableMode = 'paged' | 'continuous';
export type DataTableSearch = TableSearchParams & { mode?: 'continuous' };

export function validateTableSearch(raw: Record<string, unknown>): DataTableSearch {
  const query = parseTableQuery(raw, PATIENT_TABLE_DEFAULTS, PATIENT_TABLE_OPTIONS);
  const flat = serializeTableQuery(query, PATIENT_TABLE_DEFAULTS, PATIENT_URL_POLICY);
  return raw.mode === 'continuous' ? { ...flat, mode: 'continuous' } : flat;
}

export function queryFromSearch(search: DataTableSearch): TableQuery {
  return parseTableQuery(search, PATIENT_TABLE_DEFAULTS, PATIENT_TABLE_OPTIONS);
}
