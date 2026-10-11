import { sql } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';

import type { DbExecutor } from '../client.js';
import { DbError } from '../errors.js';

export const TENANT_POLICY = 'tenant_isolation';

export interface TenantRlsOptions {
  /** Also confine rows to app.branch_id when the transaction sets one. */
  branchScoped?: boolean;
}

/** Postgres identifier quoting (doubles embedded quotes). */
export const quoteIdent = (name: string): string => `"${name.replaceAll('"', '""')}"`;

/** "schema"."table" for a Drizzle table, or a quoted bare name for a string. */
export function qualifiedName(table: PgTable | string): string {
  if (typeof table === 'string') return quoteIdent(table);
  const { name, schema } = getTableConfig(table);
  return schema ? `${quoteIdent(schema)}.${quoteIdent(name)}` : quoteIdent(name);
}

/**
 * The row predicate every tenant table uses. `(select fn())` makes Postgres evaluate the context
 * once per query (an InitPlan), so the tenant_id index is usable.
 * Branch-scoped tables: app.branch_id is empty only when withTenant was given branchId 'all'
 * (explicit tenant-wide access); otherwise rows are confined to that branch.
 */
export function tenantPredicate(options: TenantRlsOptions = {}): string {
  const tenant = 'tenant_id = (select app_current_tenant_id())';
  if (!options.branchScoped) return tenant;
  return `${tenant} and ((select app_current_branch_id()) is null or branch_id = (select app_current_branch_id()))`;
}

/**
 * DDL that puts a table under tenant isolation: ENABLE + FORCE row level security and one
 * permissive policy whose USING and WITH CHECK are the tenant predicate, so rows can be neither
 * seen nor written across tenants. FORCE makes the policy bind the table owner (hims_owner, which
 * is not a superuser) too; only the bootstrap superuser bypasses it.
 *
 * Put the output in the table's migration (drizzle-kit does not emit FORCE):
 *   pnpm --filter @hims/db db:rls <table> [--branch]
 */
export function tenantRlsSql(table: PgTable | string, options: TenantRlsOptions = {}): string[] {
  const name = qualifiedName(table);
  const predicate = tenantPredicate(options);
  return [
    `ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE ${name} FORCE ROW LEVEL SECURITY`,
    `CREATE POLICY ${TENANT_POLICY} ON ${name} AS PERMISSIVE FOR ALL USING (${predicate}) WITH CHECK (${predicate})`,
  ];
}

export type RlsProblem = 'rls_disabled' | 'rls_not_forced' | 'no_tenant_policy';

export interface TenantTableRlsViolation {
  table: string;
  problems: RlsProblem[];
}

/**
 * Every table (or partition) with a tenant_id column must have RLS enabled and forced, and every
 * non-partition one must carry a permissive policy named tenant_isolation for ALL commands with
 * both USING and WITH CHECK (what tenantRlsSql emits). Partitions need no policy: through the parent the
 * parent's policy applies, and direct access with RLS on and no policy returns nothing.
 */
export async function findTenantTablesWithoutRls(
  db: DbExecutor,
): Promise<TenantTableRlsViolation[]> {
  const result = await db.execute<{
    name: string;
    enabled: boolean;
    forced: boolean;
    is_partition: boolean;
    has_tenant_policy: boolean;
  }>(sql`
    select format('%I.%I', n.nspname, c.relname) as name,
           c.relrowsecurity as enabled,
           c.relforcerowsecurity as forced,
           c.relispartition as is_partition,
           exists (
             select 1 from pg_policy p
              where p.polrelid = c.oid and p.polname = ${TENANT_POLICY} and p.polcmd = '*'
                and p.polpermissive and p.polqual is not null and p.polwithcheck is not null
           ) as has_tenant_policy
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
     where c.relkind in ('r', 'p')
       and n.nspname <> 'information_schema'
       and n.nspname !~ '^pg_'
     order by 1`);

  return result.rows.flatMap((row) => {
    const problems: RlsProblem[] = [];
    if (!row.enabled) problems.push('rls_disabled');
    if (!row.forced) problems.push('rls_not_forced');
    if (!row.is_partition && !row.has_tenant_policy) problems.push('no_tenant_policy');
    return problems.length > 0 ? [{ table: row.name, problems }] : [];
  });
}

export class TenantRlsMissingError extends DbError {
  readonly code = 'TENANT_RLS_MISSING';

  constructor(readonly violations: TenantTableRlsViolation[]) {
    super(
      `Tenant tables without full row-level security: ${violations
        .map((v) => `${v.table} (${v.problems.join(', ')})`)
        .join('; ')}. Add tenantRlsSql(...) to the migration.`,
    );
  }
}

/** CI and migration guard: throws TenantRlsMissingError listing every unprotected tenant table. */
export async function assertTenantTablesHaveRls(db: DbExecutor): Promise<void> {
  const violations = await findTenantTablesWithoutRls(db);
  if (violations.length > 0) throw new TenantRlsMissingError(violations);
}
