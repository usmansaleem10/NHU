import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { Button } from '../components/button.js';
import { Input, NativeSelect } from '../components/inputs.js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../components/overlays.js';
import { Skeleton } from '../components/display.js';
import { StatePanel } from '../components/state-panel.js';
import { useFormatters } from '../format/format-context.js';
import { useUiI18n } from '../i18n/context.js';
import { cn } from '../lib/cn.js';
import {
  DEFAULT_PAGE_SIZES,
  pageCount,
  setFilter,
  setPage,
  setPageSize,
  toggleSort,
  type TableQuery,
} from './query-state.js';

export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface DataTableColumn<T> {
  id: string;
  /** Already-translated header text. */
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  filter?: { kind: 'text' } | { kind: 'select'; options: readonly SelectFilterOption[] };
  align?: 'start' | 'end';
  /** Column width in px (rem-agnostic so virtual rows line up). */
  width?: number;
  /** Set false for columns that must always be visible (e.g. the record code). */
  hideable?: boolean;
}

export type DataTableStatus = 'pending' | 'error' | 'success';

export interface DataTableProps<T> {
  /** Accessible name of the table (screen readers announce it). */
  caption: string;
  columns: readonly DataTableColumn<T>[];
  /** Rows of the current page (paged) or loaded so far (continuous). */
  rows: readonly T[];
  total: number;
  getRowId: (row: T) => string;
  query: TableQuery;
  onQueryChange: (query: TableQuery) => void;
  status: DataTableStatus;
  isFetching?: boolean;
  onRetry?: () => void;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  pageSizeOptions?: readonly number[];
  /**
   * `paged`: page controls, one server page at a time.
   * `continuous`: infinite scroll — `onEndReached` asks the server for the next page.
   */
  mode?: 'paged' | 'continuous';
  onEndReached?: () => void;
  toolbar?: ReactNode;
  emptyState?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  rowActionsHeader?: string;
  /** Height of the scroll viewport, e.g. "60dvh". Rows are virtualised inside it. */
  height?: string;
  rowHeight?: number;
}

const FILTER_DEBOUNCE_MS = 300;
const END_REACHED_THRESHOLD = 20;

/**
 * Server-driven data table: controlled TableQuery in, page of rows out. Sorting, filtering and
 * paging are never done on the client. Rows are virtualised so thousands stay smooth.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    caption,
    columns,
    rows,
    total,
    getRowId,
    query,
    onQueryChange,
    status,
    isFetching = false,
    onRetry,
    columnVisibility,
    onColumnVisibilityChange,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    mode = 'paged',
    onEndReached,
    toolbar,
    emptyState,
    rowActions,
    rowActionsHeader,
    height = '60dvh',
    rowHeight = 44,
  } = props;
  const { t } = useUiI18n();

  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({});
  const visibility = columnVisibility ?? internalVisibility;

  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        enableHiding: c.hideable !== false,
        cell: (info) => c.cell(info.row.original),
        meta: c,
      })),
    [columns],
  );

  const table = useReactTable<T>({
    data: rows as T[],
    columns: columnDefs,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: total,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(visibility) : updater;
      if (onColumnVisibilityChange) onColumnVisibilityChange(next);
      else setInternalVisibility(next);
    },
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const tableRows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? -1;

  // Continuous mode: ask for the next server page as the user nears the end of what's loaded.
  useEffect(() => {
    if (mode !== 'continuous' || !onEndReached || isFetching) return;
    if (rows.length < total && lastVirtualIndex >= rows.length - END_REACHED_THRESHOLD) {
      onEndReached();
    }
  }, [mode, onEndReached, isFetching, rows.length, total, lastVirtualIndex]);

  // New query (paged) → back to the top of the viewport.
  const firstRowId = rows[0] === undefined ? undefined : getRowId(rows[0]);
  useEffect(() => {
    if (mode === 'paged' && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [mode, query.page, firstRowId]);

  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0);
  const colCount = visibleColumns.length + (rowActions ? 1 : 0);
  const hasFilters = columns.some((c) => c.filter);
  // ARIA row numbering counts the header rows (titles, plus filters when present).
  const headerRows = hasFilters ? 2 : 1;

  // A stale link or a shrinking result can leave us past the last page: go to the last one.
  const lastPage = pageCount(total, query.pageSize) - 1;
  useEffect(() => {
    if (mode === 'paged' && status === 'success' && query.page > lastPage) {
      onQueryChange(setPage(query, lastPage, total));
    }
  }, [mode, status, query, lastPage, total, onQueryChange]);

  let body: ReactNode;
  if (status === 'pending') {
    body = Array.from({ length: 8 }, (_, i) => (
      <tr key={`s${String(i)}`} className="border-b">
        {Array.from({ length: colCount }, (__, j) => (
          <td key={j} className="px-3 py-3">
            <Skeleton className="h-4 w-3/4" />
          </td>
        ))}
      </tr>
    ));
  } else if (status === 'error') {
    body = (
      <tr>
        <td colSpan={colCount}>
          <StatePanel kind="error" {...(onRetry ? { onRetry } : {})} />
        </td>
      </tr>
    );
  } else if (tableRows.length === 0) {
    body = (
      <tr>
        <td colSpan={colCount}>
          {emptyState ?? <StatePanel kind="empty" title={t('table.noRows')} />}
        </td>
      </tr>
    );
  } else {
    body = (
      <>
        {paddingTop > 0 ? (
          <tr aria-hidden>
            <td colSpan={colCount} style={{ height: paddingTop, padding: 0 }} />
          </tr>
        ) : null}
        {virtualRows.map((vr) => {
          const row = tableRows[vr.index];
          if (!row) return null;
          return (
            <tr
              key={row.id}
              data-index={vr.index}
              aria-rowindex={
                headerRows + 1 + vr.index + (mode === 'paged' ? query.page * query.pageSize : 0)
              }
              className="border-b transition-colors hover:bg-muted/60"
              style={{ height: rowHeight }}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as DataTableColumn<T>;
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'truncate px-3 py-2',
                      meta.align === 'end' ? 'text-end tabular-nums' : 'text-start',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
              {rowActions ? (
                <td className="px-3 py-1 text-end">{rowActions(row.original)}</td>
              ) : null}
            </tr>
          );
        })}
        {paddingBottom > 0 ? (
          <tr aria-hidden>
            <td colSpan={colCount} style={{ height: paddingBottom, padding: 0 }} />
          </tr>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {isFetching && status === 'success' ? t('table.refreshing') : ''}
        </span>
        <ColumnChooser table={table} />
      </div>

      {/* Focusable so keyboard users can scroll the rows (WCAG 2.1.1, scrollable region). */}
      <div
        ref={scrollRef}
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="relative overflow-auto focus-visible:outline-2 focus-visible:outline-ring"
        style={{ height }}
      >
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          aria-rowcount={total + headerRows}
          aria-busy={status === 'pending' || isFetching}
        >
          <caption className="sr-only">{caption}</caption>
          <colgroup>
            {visibleColumns.map((col) => {
              const meta = col.columnDef.meta as DataTableColumn<T>;
              return <col key={col.id} style={meta.width ? { width: meta.width } : undefined} />;
            })}
            {rowActions ? <col style={{ width: 112 }} /> : null}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-muted">
            <tr aria-rowindex={1}>
              {visibleColumns.map((col) => {
                const meta = col.columnDef.meta as DataTableColumn<T>;
                const sorted = query.sort?.id === col.id ? query.sort : null;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={sorted ? (sorted.desc ? 'descending' : 'ascending') : 'none'}
                    className={cn(
                      'border-b px-3 py-2 font-medium text-muted-foreground',
                      meta.align === 'end' ? 'text-end' : 'text-start',
                    )}
                  >
                    {meta.sortable ? (
                      <button
                        type="button"
                        className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 py-1 hover:text-foreground"
                        onClick={() => {
                          onQueryChange(toggleSort(query, col.id));
                        }}
                      >
                        <span>{meta.header}</span>
                        {sorted ? (
                          sorted.desc ? (
                            <ArrowDown
                              className="size-3.5"
                              aria-label={t('table.sortDescending')}
                            />
                          ) : (
                            <ArrowUp className="size-3.5" aria-label={t('table.sortAscending')} />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      meta.header
                    )}
                  </th>
                );
              })}
              {rowActions ? (
                <th
                  scope="col"
                  className="border-b px-3 py-2 text-end font-medium text-muted-foreground"
                >
                  <span className="sr-only">{rowActionsHeader}</span>
                </th>
              ) : null}
            </tr>
            {hasFilters ? (
              <tr aria-rowindex={2}>
                {visibleColumns.map((col) => {
                  const meta = col.columnDef.meta as DataTableColumn<T>;
                  return (
                    <th key={col.id} className="border-b px-2 py-1.5 font-normal">
                      {meta.filter ? (
                        <ColumnFilter
                          column={meta}
                          value={query.filters[col.id] ?? ''}
                          onChange={(value) => {
                            onQueryChange(setFilter(query, col.id, value));
                          }}
                        />
                      ) : null}
                    </th>
                  );
                })}
                {rowActions ? <th className="border-b" /> : null}
              </tr>
            ) : null}
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>

      {mode === 'paged' ? (
        <Pagination
          query={query}
          total={total}
          pageSizeOptions={pageSizeOptions}
          onQueryChange={onQueryChange}
        />
      ) : (
        <ContinuousFooter loaded={rows.length} total={total} />
      )}
    </div>
  );
}

function ColumnFilter<T>({
  column,
  value,
  onChange,
}: {
  column: DataTableColumn<T>;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useUiI18n();
  const label = t('table.filterBy', { column: column.header });
  if (column.filter?.kind === 'select') {
    return (
      <NativeSelect
        aria-label={label}
        className="h-8 text-xs"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        <option value="">{t('table.allOption')}</option>
        {column.filter.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    );
  }
  return (
    <DebouncedInput aria-label={label} className="h-8 text-xs" value={value} onCommit={onChange} />
  );
}

/** Text input that commits after the user pauses typing (one server request, not one per key). */
export function DebouncedInput({
  value,
  onCommit,
  delay = FILTER_DEBOUNCE_MS,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string;
  onCommit: (value: string) => void;
  delay?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [lastExternal, setLastExternal] = useState(value);
  // Values we committed that the parent hasn't echoed back yet. When the parent applies one of
  // them (after an async navigation) it is our own echo, not an external change, so the draft —
  // which may already hold newer keystrokes — stays.
  const [inFlight, setInFlight] = useState<readonly string[]>([]);
  const [committed, setCommitted] = useState(value);
  if (value !== lastExternal) {
    setLastExternal(value);
    const echo = inFlight.indexOf(value);
    if (echo >= 0) {
      setInFlight(inFlight.slice(echo + 1));
    } else {
      setInFlight([]);
      setCommitted(value);
      setDraft(value); // saved view, back button, reset
    }
  }
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(() => {
    if (draft === committed) return;
    const id = setTimeout(() => {
      setCommitted(draft);
      setInFlight((list) => [...list, draft]);
      commitRef.current(draft);
    }, delay);
    return () => {
      clearTimeout(id);
    };
  }, [draft, committed, delay]);
  return (
    <Input
      {...props}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
    />
  );
}

function ColumnChooser<T>({ table }: { table: ReturnType<typeof useReactTable<T>> }) {
  const { t } = useUiI18n();
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  if (hideable.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('table.toggleColumns')}>
          <Columns3 aria-hidden />
          <span className="hidden sm:inline">{t('table.columns')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('table.toggleColumns')}</DropdownMenuLabel>
        {hideable.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={col.getIsVisible()}
            // Keep the menu open so several columns can be toggled in one go.
            onSelect={(e) => {
              e.preventDefault();
            }}
            onCheckedChange={(checked) => {
              col.toggleVisibility(checked);
            }}
          >
            {(col.columnDef.meta as DataTableColumn<T>).header}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pagination({
  query,
  total,
  pageSizeOptions,
  onQueryChange,
}: {
  query: TableQuery;
  total: number;
  pageSizeOptions: readonly number[];
  onQueryChange: (q: TableQuery) => void;
}) {
  const { t } = useUiI18n();
  const fmt = useFormatters();
  const pages = pageCount(total, query.pageSize);
  const from = total === 0 ? 0 : query.page * query.pageSize + 1;
  const to = Math.min(total, (query.page + 1) * query.pageSize);
  const go = (page: number) => {
    onQueryChange(setPage(query, page, total));
  };
  const atStart = query.page <= 0;
  const atEnd = query.page >= pages - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">
        <span>{t('table.rowsPerPage')}</span>
        <NativeSelect
          className="h-8 w-24"
          value={query.pageSize}
          onChange={(e) => {
            onQueryChange(setPageSize(query, Number(e.target.value)));
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {fmt.count(size)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <span className="text-muted-foreground tabular-nums" aria-live="polite">
        {t('table.rangeOf', {
          from: fmt.count(from),
          to: fmt.count(to),
          total: fmt.count(total),
        })}
      </span>
      <nav
        className="flex items-center gap-1"
        aria-label={t('table.pageOf', { page: query.page + 1, pages })}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={atStart}
          onClick={() => {
            go(0);
          }}
          aria-label={t('table.firstPage')}
        >
          <ChevronsLeft className="rtl:rotate-180" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={atStart}
          onClick={() => {
            go(query.page - 1);
          }}
          aria-label={t('table.previousPage')}
        >
          <ChevronLeft className="rtl:rotate-180" aria-hidden />
        </Button>
        <span className="px-2 tabular-nums">
          {t('table.pageOf', { page: fmt.count(query.page + 1), pages: fmt.count(pages) })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={atEnd}
          onClick={() => {
            go(query.page + 1);
          }}
          aria-label={t('table.nextPage')}
        >
          <ChevronRight className="rtl:rotate-180" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={atEnd}
          onClick={() => {
            go(pages - 1);
          }}
          aria-label={t('table.lastPage')}
        >
          <ChevronsRight className="rtl:rotate-180" aria-hidden />
        </Button>
      </nav>
    </div>
  );
}

function ContinuousFooter({ loaded, total }: { loaded: number; total: number }) {
  const { t } = useUiI18n();
  const fmt = useFormatters();
  return (
    <div
      className="border-t px-3 py-2 text-sm text-muted-foreground tabular-nums"
      aria-live="polite"
    >
      {t('table.loadedOf', { loaded: fmt.count(loaded), total: fmt.count(total) })}
    </div>
  );
}
