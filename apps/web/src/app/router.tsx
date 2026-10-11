import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { foundationRoutes } from '../features/foundation';
import { homeRoute } from '../features/home';
import { RouteError, RoutePending } from './errors';
import type { AccessRequirement } from './navigation/access';
import { rootRoute } from './routes/root';

/**
 * Code-based routes (not file-based): each feature owns its routes in features/<f>/index.ts, as
 * AGENTS.md's feature layout requires, with no generated route-tree file. Every screen component
 * is behind `.lazy()`, so it ships in its own chunk (route-level code splitting).
 */
const routeTree = rootRoute.addChildren([homeRoute, ...foundationRoutes]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
    defaultPendingComponent: RoutePending,
    scrollRestoration: true,
    // App search state is flat strings (?page=2&sort=-name&f.ward=ICU). Plain URLSearchParams
    // keeps URLs readable; the router's default would JSON-quote values (page=%222%22).
    parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
    stringifySearch: (values) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'string' && value !== '') params.set(key, value);
        else if (typeof value === 'number' || typeof value === 'boolean') {
          params.set(key, String(value));
        }
      }
      const out = params.toString();
      return out ? `?${out}` : '';
    },
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface StaticDataRouteOption {
    /** Module + permission the screen needs; enforced by the shell's GuardedOutlet. */
    access?: AccessRequirement;
  }
}
