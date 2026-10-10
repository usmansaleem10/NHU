import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import { AppErrorBoundary } from './errors';
import { i18n } from './i18n/i18n';
import { createQueryClient } from './query-client';
import { createAppRouter } from './router';

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(() => createAppRouter(queryClient));
  return (
    <I18nextProvider i18n={i18n}>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AppErrorBoundary>
    </I18nextProvider>
  );
}
