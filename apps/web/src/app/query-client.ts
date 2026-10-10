import { problemFrom } from '@hims/ui';
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx problems (validation, forbidden, not found) won't fix themselves on retry.
        retry: (failureCount, error) => {
          const status = problemFrom(error)?.status;
          if (status !== undefined && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
