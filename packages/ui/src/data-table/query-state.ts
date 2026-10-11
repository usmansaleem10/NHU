/**
 * Server-driven table state (F0-UI-03). The table never sorts, filters or pages rows itself: it
 * emits a TableQuery and the data source answers with one page. These helpers are the single
 * place that state transitions and URL (de)serialisation are defined.
 */
export interface SortState {
  id: string;
  desc: boolean;
}

export interface TableQuery {
  /** Zero-based page index. */
  page: number;
  pageSize: number;
  sort: SortState | null;
  /** Free-text search across the list. */
  search: string;
  /** Column filters, keyed by column id. Empty values are never stored. */
  filters: Readonly<Record<string, string>>;
}

export interface DataPage<T> {
  rows: readonly T[];
  /** Total rows matching the query on the server (for page count / scroll height). */
  total: number;
}

/** What every list data source implements; the real API client will satisfy it later. */
export type FetchPage<T> = (query: TableQuery, signal?: AbortSignal) => Promise<DataPage<T>>;

export const DEFAULT_PAGE_SIZES = [25, 50, 100, 500, 1000] as const;

export function defaultTableQuery(overrides: Partial<TableQuery> = {}): TableQuery {
  return { page: 0, pageSize: 50, sort: null, search: '', filters: {}, ...overrides };
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Cycles a column through ascending → descending → unsorted. Returns to the first page. */
export function toggleSort(query: TableQuery, columnId: string): TableQuery {
  const current = query.sort?.id === columnId ? query.sort : null;
  const sort: SortState | null =
    current === null
      ? { id: columnId, desc: false }
      : current.desc
        ? null
        : { id: columnId, desc: true };
  return { ...query, sort, page: 0 };
}

export function setFilter(query: TableQuery, columnId: string, value: string): TableQuery {
  const trimmed = value.trim();
  const filters = Object.fromEntries(
    Object.entries(query.filters).filter(([id]) => id !== columnId),
  );
  if (trimmed) filters[columnId] = trimmed;
  return { ...query, filters, page: 0 };
}

export function setSearch(query: TableQuery, search: string): TableQuery {
  return { ...query, search, page: 0 };
}

export function setPage(query: TableQuery, page: number, total: number): TableQuery {
  const last = pageCount(total, query.pageSize) - 1;
  return { ...query, page: Math.min(Math.max(0, Math.trunc(page)), last) };
}

/** Changes page size while keeping the first visible row on screen. */
export function setPageSize(query: TableQuery, pageSize: number): TableQuery {
  const firstRow = query.page * query.pageSize;
  return { ...query, pageSize, page: Math.floor(firstRow / pageSize) };
}

/** Flat, URL-friendly representation. Only non-default values are emitted. */
export type TableSearchParams = Partial<Record<'page' | 'size' | 'sort' | 'q', string>> &
  Record<`f.${string}`, string>;

export function serializeTableQuery(query: TableQuery, defaults: TableQuery): TableSearchParams {
  const out: Record<string, string> = {};
  if (query.page !== defaults.page) out.page = String(query.page + 1);
  if (query.pageSize !== defaults.pageSize) out.size = String(query.pageSize);
  if (query.sort) out.sort = `${query.sort.desc ? '-' : ''}${query.sort.id}`;
  if (query.search) out.q = query.search;
  for (const [id, value] of Object.entries(query.filters)) out[`f.${id}`] = value;
  return out;
}

export interface ParseOptions {
  sortable: readonly string[];
  filterable: readonly string[];
  pageSizes: readonly number[];
}

/**
 * Parses untrusted URL search params back into a query. Anything unknown or malformed falls back
 * to the default, so a hand-edited or stale link can never request e.g. a 1e9-row page or sort
 * on a column the server doesn't index.
 */
export function parseTableQuery(
  raw: Readonly<Record<string, unknown>>,
  defaults: TableQuery,
  options: ParseOptions,
): TableQuery {
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;

  const pageNum = Number(str(raw.page));
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum - 1 : defaults.page;

  const sizeNum = Number(str(raw.size));
  const pageSize = options.pageSizes.includes(sizeNum) ? sizeNum : defaults.pageSize;

  let sort = defaults.sort;
  const sortRaw = str(raw.sort);
  if (sortRaw) {
    const desc = sortRaw.startsWith('-');
    const id = desc ? sortRaw.slice(1) : sortRaw;
    sort = options.sortable.includes(id) ? { id, desc } : defaults.sort;
  }

  const search = (str(raw.q) ?? defaults.search).slice(0, 200);

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('f.')) continue;
    const id = key.slice(2);
    const v = str(value)?.trim();
    if (v && options.filterable.includes(id)) filters[id] = v.slice(0, 200);
  }

  return { page, pageSize, sort, search, filters };
}

/** Stable value for query keys / equality. */
export function tableQueryKey(query: TableQuery): string {
  const filters = Object.keys(query.filters)
    .sort()
    .map((k) => [k, query.filters[k]]);
  return JSON.stringify([query.page, query.pageSize, query.sort, query.search, filters]);
}
