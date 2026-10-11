import type { LevelWithSilent, LoggerOptions } from 'pino';
import { stdSerializers } from 'pino';

export const REDACTED = '[REDACTED]';

/** Field names that carry personal data or credentials (AGENTS.md rule 10: never logged). */
const SENSITIVE_KEYS = [
  'cnic',
  'phone',
  'phoneNumber',
  'mobile',
  'mobileNumber',
  'password',
  'passwordHash',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'apiKey',
  'secret',
  'name',
  'email',
  'address',
  'dob',
  'dateOfBirth',
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'cookie',
] as const;

// pino's redaction matches fixed paths, so cover each key from the top level down to five
// levels deep (`*` also matches array indices). Deeper PII must not be logged at all.
const MAX_DEPTH = 5;

export const REDACT_PATHS: readonly string[] = [
  ...SENSITIVE_KEYS.flatMap((key) =>
    Array.from({ length: MAX_DEPTH + 1 }, (_, depth) => {
      const prefix = Array<string>(depth).fill('*').join('.');
      // Header-style keys (x-api-key) need bracket notation.
      if (key.includes('-')) return `${prefix}["${key}"]`;
      return prefix ? `${prefix}.${key}` : key;
    }),
  ),
  'res.headers["set-cookie"]',
];

// Free-text safety net for values that end up in messages instead of fields. Every pattern is
// bounded (no unbounded repetition before a required delimiter) and input is capped first, so
// masking stays linear on adversarial input. Lookarounds keep IDs and epoch timestamps intact.
const MAX_MASKED_LENGTH = 8 * 1024;
const TRUNCATED = '…[truncated]';
const CNIC_PATTERN = /(?<!\d)\d{5}-?\d{7}-?\d(?!\d)/g;
const PK_MOBILE_PATTERN = /(?<![\d+])(?:\+92|0092|92|0)?-?3\d{2}[- ]?\d{7}(?!\d)/g;
// Postgres echoes row values: `Key (cnic)=(35202-...) already exists`, `Failing row contains (...)`.
const PG_KEY_VALUE_PATTERN = /(Key \([^)\n]{0,256}\)=\()[^)\n]{0,1024}(\))/g;
const PG_FAILING_ROW_PATTERN = /(Failing row contains \()[^\n]{0,4096}(\))/g;
// Drizzle appends the bound values to its message: `Failed query: ...\nparams: a,b`.
const DRIZZLE_PARAMS_PATTERN = /(\nparams:)[^\n]{0,8192}/g;

export function maskPii(input: string): string {
  const text =
    input.length > MAX_MASKED_LENGTH ? `${input.slice(0, MAX_MASKED_LENGTH)}${TRUNCATED}` : input;
  return text
    .replace(PG_KEY_VALUE_PATTERN, `$1${REDACTED}$2`)
    .replace(PG_FAILING_ROW_PATTERN, `$1${REDACTED}$2`)
    .replace(DRIZZLE_PARAMS_PATTERN, `$1 ${REDACTED}`)
    .replace(CNIC_PATTERN, REDACTED)
    .replace(PK_MOBILE_PATTERN, REDACTED);
}

// Bound SQL parameters (Drizzle `params`, pg `parameters`) and pg's `where` context carry row
// values: never log them.
const DROPPED_ERROR_KEYS = new Set(['params', 'parameters', 'values', 'where']);

function scrub(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return maskPii(value);
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !DROPPED_ERROR_KEYS.has(key))
      .map(([key, item]) => [key, scrub(item, depth + 1)]),
  );
}

/** pino's error serializer, then PII masking over every string and no bound parameters. */
function serializeError(error: unknown): unknown {
  return error instanceof Error ? scrub(stdSerializers.err(error), 0) : scrub(error, 0);
}

interface SerializedRequest {
  url?: unknown;
  query?: unknown;
  [key: string]: unknown;
}

/** Requests are logged by path only: query strings may carry identifiers. */
function serializeRequest(req: SerializedRequest): SerializedRequest {
  const rest = Object.fromEntries(Object.entries(req).filter(([key]) => key !== 'query'));
  return typeof req.url === 'string' ? { ...rest, url: req.url.split('?')[0] } : rest;
}

export function createLoggerOptions(level: LevelWithSilent): LoggerOptions {
  return {
    level,
    redact: { paths: [...REDACT_PATHS], censor: REDACTED },
    serializers: { err: serializeError, req: serializeRequest },
    hooks: {
      logMethod(args, method) {
        method.apply(
          this,
          args.map((arg: unknown) => (typeof arg === 'string' ? maskPii(arg) : arg)) as typeof args,
        );
      },
    },
  };
}
