import { useCallback, useEffect, useState } from 'react';

import type { TableQuery } from './query-state.js';

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

export function useSavedViews(tableId: string, store: SavedViewsStore) {
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
        query: withoutPage(query),
        columnVisibility,
      });
      await refresh();
    },
    [store, tableId, refresh],
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

/** Applies a saved view: always lands on the first page. */
export function applySavedView(view: SavedView): TableQuery {
  return { ...view.query, page: 0 };
}
