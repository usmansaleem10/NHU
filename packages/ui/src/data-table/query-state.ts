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

/**
 * Sets a column filter exactly as typed (a blank value removes it). Values are NOT trimmed here:
 * the filter input echoes this state back while the user is still typing, so trimming would eat
 * the space in "Ali |Khan". Trim when building the request (toRequestQuery).
 */
export function setFilter(query: TableQuery, columnId: string, value: string): TableQuery {
  const filters = Object.fromEntries(
    Object.entries(query.filters).filter(([id]) => id !== columnId),
  );
  if (value.trim()) filters[columnId] = value;
  return { ...query, filters, page: 0 };
}

/** The query as sent to the server (and used as the cache key): text trimmed. */
export function toRequestQuery(query: TableQuery): TableQuery {
  return {
    ...query,
    search: query.search.trim(),
    filters: Object.fromEntries(Object.entries(query.filters).map(([id, v]) => [id, v.trim()])),
  };
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

/**
 * What may be written to the page URL (and to saved views). URLs end up in history, logs,
 * screenshots and shared links, so personal data never goes there (AGENTS.md rule 10):
 * free-text search can hold a name or MRN, and identifier filters are identifiers.
 */
export interface UrlPolicy {
  /** Allow the free-text search (only for lists with no personal data, e.g. masters). */
  search: boolean;
  /** Filter columns whose values are safe in a URL (enums like status/ward, not identifiers). */
  filters: readonly string[];
}

export function serializeTableQuery(
  query: TableQuery,
  defaults: TableQuery,
  policy: UrlPolicy,
): TableSearchParams {
  const out: Record<string, string> = {};
  if (query.page !== defaults.page) out.page = String(query.page + 1);
  if (query.pageSize !== defaults.pageSize) out.size = String(query.pageSize);
  if (query.sort) out.sort = `${query.sort.desc ? '-' : ''}${query.sort.id}`;
  if (query.search && policy.search) out.q = query.search;
  for (const [id, value] of Object.entries(query.filters)) {
    if (policy.filters.includes(id)) out[`f.${id}`] = value;
  }
  return out;
}

/** The parts of a query that must NOT go to the URL; keep them in memory. */
export function sensitivePart(
  query: TableQuery,
  policy: UrlPolicy,
): Pick<TableQuery, 'search' | 'filters'> {
  return {
    search: policy.search ? '' : query.search,
    filters: Object.fromEntries(
      Object.entries(query.filters).filter(([id]) => !policy.filters.includes(id)),
    ),
  };
}

/** Re-attaches the in-memory sensitive part to a query parsed from the URL. */
export function withSensitive(
  query: TableQuery,
  sensitive: Pick<TableQuery, 'search' | 'filters'>,
): TableQuery {
  return {
    ...query,
    search: sensitive.search || query.search,
    filters: { ...query.filters, ...sensitive.filters },
  };
}

export interface ParseOptions {
  sortable: readonly string[];
  filterable: readonly string[];
  pageSizes: readonly number[];
  /** Only what this policy allows is read back from the URL. */
  url: UrlPolicy;
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

  const search = options.url.search
    ? (str(raw.q) ?? defaults.search).slice(0, 200)
    : defaults.search;

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('f.')) continue;
    const id = key.slice(2);
    const v = str(value); // kept as typed (see setFilter); trimmed by toRequestQuery
    if (v?.trim() && options.filterable.includes(id) && options.url.filters.includes(id)) {
      filters[id] = v.slice(0, 200);
    }
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
