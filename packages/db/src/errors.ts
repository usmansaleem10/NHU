/**
 * Typed errors raised by @hims/db. Callers branch on `code`, never on the message
 * (AGENTS.md: return typed DomainErrors, never throw strings). The API maps these to
 * HTTP responses (STALE_VERSION -> 409, RECORD_NOT_FOUND -> 404).
 */
export abstract class DbError extends Error {
  abstract readonly code: string;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Optimistic-lock conflict: the row changed since the caller read it. */
export class StaleVersionError extends DbError {
  readonly code = 'STALE_VERSION';

  constructor(
    readonly table: string,
    readonly id: string,
    readonly expectedVersion: number,
    readonly actualVersion: number,
  ) {
    super(
      `${table} ${id} is at version ${String(actualVersion)}, expected ${String(expectedVersion)}`,
    );
  }
}

/** The row does not exist, or row-level security hides it from the current tenant. */
export class RecordNotFoundError extends DbError {
  readonly code = 'RECORD_NOT_FOUND';

  constructor(
    readonly table: string,
    readonly id: string,
  ) {
    super(`${table} ${id} not found`);
  }
}

/** A tenant/branch/user context value is malformed (not a UUID). */
export class InvalidTenantContextError extends DbError {
  readonly code = 'INVALID_TENANT_CONTEXT';

  constructor(field: string) {
    super(`${field} must be a UUID`);
  }
}

/** Migrations were pointed at the application role instead of the owner role. */
export class MigrationRoleError extends DbError {
  readonly code = 'MIGRATION_ROLE';

  constructor(role: string) {
    super(
      `Migrations must run as the owner role over a direct Postgres connection, not as "${role}"`,
    );
  }
}
