import { z } from 'zod';

/** `true`/`false` flag; anything else is a configuration error. */
const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

/** Every environment variable the API reads. Parsed once at boot; nothing else touches process.env. */
export const envSchema = z
  .object({
    // Required: a missing NODE_ENV must not silently run production with development settings.
    NODE_ENV: z.enum(['development', 'test', 'production']),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    /** Deployed release (git SHA or tag), reported by GET /api/v1/meta/version. */
    APP_RELEASE: z.string().min(1).default('dev'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    /** Serve /api/docs and /api/docs/openapi.json. Off unless explicitly enabled. */
    API_DOCS_ENABLED: flag,
    /** Reuse an incoming x-request-id only when a trusted proxy sets it. */
    TRUST_PROXY_REQUEST_ID: flag,
    /** HMAC key for list cursors. Required in production; a per-process random key otherwise. */
    CURSOR_SECRET: z.string().min(32).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.CURSOR_SECRET === undefined) {
      ctx.addIssue({ code: 'custom', path: ['CURSOR_SECRET'], message: 'Required in production' });
    }
  });

export type Env = z.infer<typeof envSchema>;

export interface EnvIssue {
  variable: string;
  problem: string;
}

/** Boot-time configuration failure. The message names variables but never echoes their values. */
export class EnvValidationError extends Error {
  override readonly name = 'EnvValidationError';

  constructor(readonly issues: readonly EnvIssue[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map(({ variable, problem }) => `  - ${variable}: ${problem}`)
        .join('\n')}`,
    );
  }
}

export function loadEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  throw new EnvValidationError(
    result.error.issues.map((issue) => ({
      variable: issue.path.join('.'),
      // Zod's built-in messages describe the expectation, not the received value.
      problem: issue.message,
    })),
  );
}
