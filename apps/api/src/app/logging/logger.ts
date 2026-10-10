import type { LevelWithSilent, LoggerOptions } from 'pino';

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
  'authorization',
  'cookie',
] as const;

// pino's redaction matches fixed paths, so cover each key from the top level down to five
// levels deep (`*` also matches array indices). Deeper PII must not be logged at all.
const MAX_DEPTH = 5;

export const REDACT_PATHS: readonly string[] = [
  ...SENSITIVE_KEYS.flatMap((key) =>
    Array.from({ length: MAX_DEPTH + 1 }, (_, depth) =>
      [...Array<string>(depth).fill('*'), key].join('.'),
    ),
  ),
  'res.headers["set-cookie"]',
];

// Free-text safety net for values that end up in messages instead of fields.
const CNIC_PATTERN = /\b\d{5}-?\d{7}-?\d\b/g;
const PK_MOBILE_PATTERN = /(?:\+92|\b0092|\b92|\b0)?-?3\d{2}[- ]?\d{7}\b/g;

export function maskPii(text: string): string {
  return text.replace(CNIC_PATTERN, REDACTED).replace(PK_MOBILE_PATTERN, REDACTED);
}

export function createLoggerOptions(level: LevelWithSilent): LoggerOptions {
  return {
    level,
    redact: { paths: [...REDACT_PATHS], censor: REDACTED },
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
