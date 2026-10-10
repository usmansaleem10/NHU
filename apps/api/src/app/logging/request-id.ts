import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

// Ids from upstream proxies are reused only when they are short and log-safe.
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

/** Reuse the caller's x-request-id when it is safe to log, otherwise mint a UUID. */
export function resolveRequestId(header: string | readonly string[] | undefined): string {
  const incoming = typeof header === 'string' ? header : header?.[0];
  return incoming !== undefined && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}
