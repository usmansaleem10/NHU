import { sql } from 'drizzle-orm';

import type { DbExecutor } from '../client.js';
import { InvalidTenantContextError } from '../errors.js';

export interface TenantContext {
  /** Resolved from hostname + session by the API, never from the request body (AGENTS.md rule 1). */
  tenantId: string;
  /** Omit for tenant-wide access (sees every branch); set it to confine to one branch. */
  branchId?: string | undefined;
  /** Acting user, recorded in created_by / updated_by. Omit for system jobs. */
  userId?: string | undefined;
}

/** The transaction handle a given database's transaction() callback receives. */
export type TransactionOf<TDb extends DbExecutor> = Parameters<
  Parameters<TDb['transaction']>[0]
>[0];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkUuid(field: string, value: string | undefined): void {
  if (value !== undefined && !UUID.test(value)) throw new InvalidTenantContextError(field);
}

/**
 * Runs fn in a transaction whose tenant/branch/user context is set with set_config(..., true).
 *
 * The settings are transaction-local on purpose: behind PgBouncer transaction pooling the next
 * transaction on the same server connection may belong to another tenant, and PgBouncer never
 * runs server_reset_query in that mode. Session-level SET would leak; this cannot.
 * Every tenant table's RLS policy reads these settings, so no context means no rows.
 */
export async function withTenant<TDb extends DbExecutor, T>(
  db: TDb,
  context: TenantContext,
  fn: (tx: TransactionOf<TDb>) => Promise<T>,
): Promise<T> {
  checkUuid('tenantId', context.tenantId);
  checkUuid('branchId', context.branchId);
  checkUuid('userId', context.userId);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select
      set_config('app.tenant_id', ${context.tenantId}, true),
      set_config('app.branch_id', ${context.branchId ?? ''}, true),
      set_config('app.user_id', ${context.userId ?? ''}, true)`);
    return fn(tx);
  });
}
