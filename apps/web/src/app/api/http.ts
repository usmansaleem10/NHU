import { API_VERSION } from '@hims/contracts';
import { isProblemDetails, ProblemError } from '@hims/ui';

/**
 * Minimal fetch wrapper the generated contracts client (F0-API) plugs into. Auth is the HttpOnly
 * session cookie (AGENTS.md rule 11), so requests are same-origin with credentials and never carry
 * tokens. Non-2xx problem+json responses become ProblemError, which the form kit maps to fields.
 */
export const API_BASE = `/api/${API_VERSION}`;

export class HttpError extends Error {
  override readonly name = 'HttpError';
  constructor(readonly status: number) {
    super(`HTTP ${String(status)}`);
  }
}

export async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json, application/problem+json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
  if (response.status === 204) return undefined;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw isProblemDetails(body) ? new ProblemError(body) : new HttpError(response.status);
  }
  return body;
}
