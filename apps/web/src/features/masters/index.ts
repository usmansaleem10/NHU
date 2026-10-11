// Feature: masters (P04 Master data & lookups; F0-UI-05 metadata-driven CRUD generator).
// Public API: routes and the data-source contract the API client implements.
import {
  defaultTableQuery,
  parseTableQuery,
  serializeTableQuery,
  type TableSearchParams,
} from '@hims/ui';
import { createRoute } from '@tanstack/react-router';

import { rootRoute } from '../../app/routes/root';

export type { MasterDataSource, MasterInput, MasterRecord } from './crud/types';

const CATALOG_ACCESS = { module: 'masters', permission: 'masters.catalog.view' } as const;

export const MASTER_TABLE_DEFAULTS = defaultTableQuery({ pageSize: 50 });
export const MASTER_TABLE_OPTIONS = {
  sortable: ['code', 'name'],
  filterable: ['code', 'name', 'status'],
  pageSizes: [25, 50, 100],
} as const;

export const mastersCatalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/masters',
  staticData: { access: CATALOG_ACCESS },
}).lazy(() => import('./routes/catalog.lazy').then((m) => m.Route));

/** One generic route serves every master; the master's own view permission is checked inside. */
export const masterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/masters/$masterId',
  staticData: { access: CATALOG_ACCESS },
  validateSearch: (raw: Record<string, unknown>): TableSearchParams =>
    serializeTableQuery(
      parseTableQuery(raw, MASTER_TABLE_DEFAULTS, MASTER_TABLE_OPTIONS),
      MASTER_TABLE_DEFAULTS,
    ),
}).lazy(() => import('./routes/master.lazy').then((m) => m.Route));

export const mastersRoutes = [mastersCatalogRoute, masterRoute] as const;
