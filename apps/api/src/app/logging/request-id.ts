import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

// Upstream ids are only ever used when short and log-safe.
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

type HeaderValue = string | readonly string[] | undefined;

function safeIncoming(header: HeaderValue): string | undefined {
  const incoming = typeof header === 'string' ? header : header?.[0];
  return incoming !== undefined && SAFE_REQUEST_ID.test(incoming) ? incoming : undefined;
}

/**
 * The server's request id. A client-chosen id is adopted only behind a trusted proxy
 * (TRUST_PROXY_REQUEST_ID=true); otherwise clients could forge or collide ids in our logs.
 */
export function resolveRequestId(header: HeaderValue, trustUpstream: boolean): string {
  return (trustUpstream ? safeIncoming(header) : undefined) ?? randomUUID();
}

/** The caller's x-request-id, logged as `upstreamRequestId` for correlation when not adopted. */
export function upstreamRequestId(header: HeaderValue): string | undefined {
  return safeIncoming(header);
}
