import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { NotFound } from '../errors';

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Root of the code-based route tree. Features attach their routes with
 * `getParentRoute: () => rootRoute` and are assembled in app/router.tsx.
 */
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <main id="main" className="min-h-dvh p-4 md:p-6">
      <Outlet />
    </main>
  );
}
