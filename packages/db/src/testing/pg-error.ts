import { AssertionError } from 'node:assert';

export interface PgError {
  /** SQLSTATE, e.g. 42501 insufficient_privilege (what an RLS WITH CHECK failure raises). */
  code: string;
  message: string;
}

export const RLS_VIOLATION = '42501';

function findPgError(error: unknown): PgError | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, message: current.message };
    }
  }
  return undefined;
}

/**
 * Awaits an operation that must fail in Postgres and returns the server error (Drizzle wraps it
 * in DrizzleQueryError.cause). Throws if the operation succeeds or fails outside Postgres.
 */
export async function pgErrorOf(operation: Promise<unknown>): Promise<PgError> {
  try {
    await operation;
  } catch (error) {
    const pgError = findPgError(error);
    if (pgError) return pgError;
    throw error;
  }
  throw new AssertionError({ message: 'expected the operation to be rejected by Postgres' });
}
