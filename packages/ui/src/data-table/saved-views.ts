import { useCallback, useEffect, useState } from 'react';

import type { TableQuery, UrlPolicy } from './query-state.js';

/** A named table configuration: filters, sort, search, page size and visible columns. */
export interface SavedView {
  id: string;
  name: string;
  query: Omit<TableQuery, 'page'>;
  columnVisibility: Readonly<Record<string, boolean>>;
}

/**
 * Persistence for saved views. Phase 0 ships a browser-storage implementation; the API-backed
 * per-user store implements the same interface later (views are preferences, not secrets).
 */
export interface SavedViewsStore {
  list(tableId: string): Promise<SavedView[]>;
  save(tableId: string, view: SavedView): Promise<void>;
  remove(tableId: string, viewId: string): Promise<void>;
}

function isSavedView(v: unknown): v is SavedView {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string' && typeof o.query === 'object';
}

export function createStorageSavedViewsStore(
  storage: Storage,
  prefix = 'hims.views.',
): SavedViewsStore {
  const read = (tableId: string): SavedView[] => {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(prefix + tableId) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isSavedView) : [];
    } catch {
      return []; // corrupt entry: start fresh rather than break the screen
    }
  };
  const write = (tableId: string, views: SavedView[]) => {
    storage.setItem(prefix + tableId, JSON.stringify(views));
  };
  return {
    list: (tableId) => Promise.resolve(read(tableId)),
    save: (tableId, view) => {
      // Saving under an existing name replaces that view.
      const others = read(tableId).filter((v) => v.id !== view.id && v.name !== view.name);
      write(tableId, [...others, view]);
      return Promise.resolve();
    },
    remove: (tableId, viewId) => {
      write(
        tableId,
        read(tableId).filter((v) => v.id !== viewId),
      );
      return Promise.resolve();
    },
  };
}

/** `tableId` should be a savedViewScope(); `policy` decides what may be persisted. */
export function useSavedViews(tableId: string, store: SavedViewsStore, policy: UrlPolicy) {
  const [views, setViews] = useState<SavedView[]>([]);

  const refresh = useCallback(async () => {
    setViews(await store.list(tableId));
  }, [store, tableId]);

  useEffect(() => {
    let active = true;
    void store.list(tableId).then((v) => {
      if (active) setViews(v);
    });
    return () => {
      active = false;
    };
  }, [store, tableId]);

  const save = useCallback(
    async (name: string, query: TableQuery, columnVisibility: Record<string, boolean>) => {
      await store.save(tableId, {
        id: crypto.randomUUID(),
        name: name.trim(),
        query: toSavedQuery(query, policy),
        columnVisibility,
      });
      await refresh();
    },
    [store, tableId, refresh, policy],
  );

  const remove = useCallback(
    async (viewId: string) => {
      await store.remove(tableId, viewId);
      await refresh();
    },
    [store, tableId, refresh],
  );

  return { views, save, remove };
}

export function withoutPage(query: TableQuery): Omit<TableQuery, 'page'> {
  return {
    pageSize: query.pageSize,
    sort: query.sort,
    search: query.search,
    filters: query.filters,
  };
}

/**
 * What a saved view may persist: the same rule as the URL (browser storage is no place for
 * personal data either). Search and identifying filters are dropped.
 */
export function toSavedQuery(query: TableQuery, policy: UrlPolicy): Omit<TableQuery, 'page'> {
  return {
    ...withoutPage(query),
    search: policy.search ? query.search : '',
    filters: Object.fromEntries(
      Object.entries(query.filters).filter(([id]) => policy.filters.includes(id)),
    ),
  };
}

/** Storage scope for one user's views of one table, so tenants and users never share views. */
export function savedViewScope(tenantId: string, userId: string, tableId: string): string {
  return [tenantId, userId, tableId].map(encodeURIComponent).join('/');
}

/**
 * One-time startup cleanup: views saved before tenant/user scoping live under unscoped keys
 * (`hims.views.<table>`) and may contain search terms or identifying filters. Scoped keys always
 * contain exactly two '/' separators (encodeURIComponent never emits '/'), so anything else under
 * the prefix is legacy and is removed.
 */
export function purgeLegacySavedViews(storage: Storage, prefix = 'hims.views.'): void {
  const legacy: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(prefix) && key.slice(prefix.length).split('/').length !== 3) {
      legacy.push(key);
    }
  }
  for (const key of legacy) storage.removeItem(key);
}

/** Applies a saved view: always lands on the first page. */
export function applySavedView(view: SavedView): TableQuery {
  return { ...view.query, page: 0 };
}
