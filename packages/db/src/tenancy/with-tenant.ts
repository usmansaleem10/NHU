import { sql } from 'drizzle-orm';

import type { DbExecutor } from '../client.js';
import { DbError, InvalidTenantContextError } from '../errors.js';

/** Tenant-wide access: every branch of the tenant. Must be asked for explicitly. */
export const ALL_BRANCHES = 'all';

export interface TenantContext {
  /** Resolved from hostname + session by the API, never from the request body (AGENTS.md rule 1). */
  tenantId: string;
  /**
   * A branch UUID confines branch-scoped tables to that branch. `'all'` (ALL_BRANCHES) grants
   * tenant-wide access and is required explicitly, so forgetting the branch fails instead of
   * silently widening access.
   */
  branchId: string;
  /** Acting user, recorded in created_by / updated_by. Omit for system jobs. */
  userId?: string | undefined;
}

/** A nested withTenant asked for a different context than the transaction already has. */
export class TenantContextConflictError extends DbError {
  readonly code = 'TENANT_CONTEXT_CONFLICT';

  constructor() {
    super('withTenant cannot switch tenant/branch/user inside an open tenant transaction');
  }
}

/** The transaction handle a given database's transaction() callback receives. */
export type TransactionOf<TDb extends DbExecutor> = Parameters<
  Parameters<TDb['transaction']>[0]
>[0];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

function validate(context: TenantContext): { tenant: string; branch: string; user: string } {
  // Runtime checks too: callers may be untyped (CJS) or build the context dynamically.
  if (!isUuid(context.tenantId)) throw new InvalidTenantContextError('tenantId');
  const branch: unknown = context.branchId;
  if (branch !== ALL_BRANCHES && !isUuid(branch)) {
    throw new InvalidTenantContextError('branchId (or "all")');
  }
  if (context.userId !== undefined && !isUuid(context.userId)) {
    throw new InvalidTenantContextError('userId');
  }
  return {
    tenant: context.tenantId.toLowerCase(),
    branch: branch === ALL_BRANCHES ? '' : branch.toLowerCase(),
    user: context.userId?.toLowerCase() ?? '',
  };
}

/**
 * Runs fn in a transaction whose tenant/branch/user context is set with set_config(..., true).
 *
 * The settings are transaction-local on purpose: behind PgBouncer transaction pooling the next
 * transaction on the same server connection may belong to another tenant, and PgBouncer never
 * runs server_reset_query in that mode. Session-level SET would leak; this cannot.
 * Every tenant table's RLS policy reads these settings, so no context means no rows.
 *
 * Nesting (passing a transaction as db) opens a savepoint; a set_config there would survive
 * RELEASE and leak into the outer transaction, so a nested call with a different context throws
 * TenantContextConflictError. Nesting with the same context is fine.
 */
export async function withTenant<TDb extends DbExecutor, T>(
  db: TDb,
  context: TenantContext,
  fn: (tx: TransactionOf<TDb>) => Promise<T>,
): Promise<T> {
  const wanted = validate(context);

  return db.transaction(async (tx) => {
    const current = await tx.execute<{ tenant: string; branch: string; user: string }>(sql`select
      coalesce(current_setting('app.tenant_id', true), '') as tenant,
      coalesce(current_setting('app.branch_id', true), '') as branch,
      coalesce(current_setting('app.user_id', true), '') as user`);
    const now = current.rows[0];
    if (now?.tenant) {
      if (
        now.tenant !== wanted.tenant ||
        now.branch !== wanted.branch ||
        now.user !== wanted.user
      ) {
        throw new TenantContextConflictError();
      }
      return fn(tx);
    }

    await tx.execute(sql`select
      set_config('app.tenant_id', ${wanted.tenant}, true),
      set_config('app.branch_id', ${wanted.branch}, true),
      set_config('app.user_id', ${wanted.user}, true)`);
    return fn(tx);
  });
}
