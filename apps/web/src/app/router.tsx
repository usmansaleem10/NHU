import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { homeRoute } from '../features/home';
import { RouteError, RoutePending } from './errors';
import type { AccessRequirement } from './navigation/access';
import { rootRoute } from './routes/root';

/**
 * Code-based routes (not file-based): each feature owns its routes in features/<f>/index.ts, as
 * AGENTS.md's feature layout requires, with no generated route-tree file. Every screen component
 * is behind `.lazy()`, so it ships in its own chunk (route-level code splitting).
 */
const routeTree = rootRoute.addChildren([homeRoute]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
    defaultPendingComponent: RoutePending,
    scrollRestoration: true,
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
