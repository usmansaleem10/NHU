import { problemFrom } from '@hims/ui';
import { QueryClient } from '@tanstack/react-query';

import { HttpError } from './api/http';

const MAX_RETRIES = 2;

function statusOf(error: unknown): number | undefined {
  if (error instanceof HttpError) return error.status;
  return problemFrom(error)?.status;
}

/**
 * 4xx (validation, 401 session expired, 403 forbidden, 404) won't fix itself on retry, whether
 * the body was problem+json or not. Server and network failures get two more attempts.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = statusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
    },
  });
}
