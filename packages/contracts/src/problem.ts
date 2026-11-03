import { z } from 'zod';

/** RFC 9457 media type for every API error response. */
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/**
 * Problem categories the API can return, with their HTTP status. The web switches on
 * `type` (category) or `code` (specific rule) and maps `code` to an i18n message;
 * `title` and `detail` are for developers and logs, not end users.
 */
export const PROBLEM_KINDS = {
  validation: { status: 400, title: 'Invalid request' },
  unauthenticated: { status: 401, title: 'Authentication required' },
  forbidden: { status: 403, title: 'Forbidden' },
  'not-found': { status: 404, title: 'Not found' },
  conflict: { status: 409, title: 'Conflict' },
  'business-rule': { status: 422, title: 'Business rule violated' },
  internal: { status: 500, title: 'Internal server error' },
  unavailable: { status: 503, title: 'Service unavailable' },
} as const satisfies Record<string, { status: number; title: string }>;

export type ProblemKind = keyof typeof PROBLEM_KINDS;

/** `type` URI for a problem kind, e.g. `urn:hims:problem:not-found`. */
export function problemType(kind: ProblemKind): `urn:hims:problem:${ProblemKind}` {
  return `urn:hims:problem:${kind}`;
}

export const fieldErrorSchema = z.object({
  /** Dotted path into the request input, e.g. `filter.status`; empty for the whole input. */
  path: z.string(),
  message: z.string(),
});
export type FieldError = z.infer<typeof fieldErrorSchema>;

/** RFC 9457 problem details plus HIMS members (`code`, `requestId`, `errors`). */
export const problemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    detail: z.string().optional(),
    instance: z.string().optional(),
    /** Stable machine-readable code, e.g. `patient.not_found`. */
    code: z.string(),
    /** Echo of the x-request-id header, for support tickets and log lookup. */
    requestId: z.string().optional(),
    errors: z.array(fieldErrorSchema).optional(),
  })
  // Problem types may carry extension members (RFC 9457 §3.2).
  .loose();

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
