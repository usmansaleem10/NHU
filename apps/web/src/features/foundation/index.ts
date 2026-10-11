// Feature: foundation (epic F0-UI, "Frontend foundation"). Reference screens that exercise the
// shared kit end to end: data table (F0-UI-03), form kit (F0-UI-04), patient search (F0-UI-07).
// Public API: routes only.
import { createRoute } from '@tanstack/react-router';

import { rootRoute } from '../../app/routes/root';
import { validateTableSearch } from './routes/data-table.search';

export const dataTableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/foundation/data-table',
  staticData: { access: { module: 'foundation', permission: 'foundation.table.view' } },
  validateSearch: validateTableSearch,
}).lazy(() => import('./routes/data-table.lazy').then((m) => m.Route));

export const formsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/foundation/forms',
  staticData: { access: { module: 'foundation', permission: 'foundation.form.view' } },
}).lazy(() => import('./routes/forms.lazy').then((m) => m.Route));

export const patientSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/foundation/patient-search',
  staticData: {
    access: { module: 'foundation', permission: 'foundation.patientSearch.view' },
  },
}).lazy(() => import('./routes/patient-search.lazy').then((m) => m.Route));

export const foundationRoutes = [dataTableRoute, formsRoute, patientSearchRoute] as const;
