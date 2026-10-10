// Feature: home (P07 Home shell). Public API: the route only.
import { createRoute } from '@tanstack/react-router';

import { rootRoute } from '../../app/routes/root';

export const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' }).lazy(() =>
  import('./routes/home.lazy').then((m) => m.Route),
);
