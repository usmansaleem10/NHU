import { StatePanel } from '@hims/ui';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext } from '@tanstack/react-router';

import { NotFound } from '../errors';
import { services } from '../services';
import { SessionProvider } from '../session/session-provider';
import { AppShell } from '../shell/app-shell';

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
    <SessionProvider source={services.session}>
      {(state) =>
        state.status === 'ready' ? (
          <AppShell />
        ) : (
          <main className="flex min-h-dvh items-center justify-center p-6">
            {state.status === 'error' ? (
              <StatePanel kind="error" onRetry={state.retry} />
            ) : (
              <StatePanel kind="loading" className="w-full max-w-md" />
            )}
          </main>
        )
      }
    </SessionProvider>
  );
}
