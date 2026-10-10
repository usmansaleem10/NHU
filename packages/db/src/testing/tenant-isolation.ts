import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import type { PgColumn, PgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';

import type { DbExecutor } from '../client.js';
import { type TenantContext, type TransactionOf, withTenant } from '../tenancy/with-tenant.js';
import { pgErrorOf, RLS_VIOLATION } from './pg-error.js';

export interface IsolationScenario<TDb extends DbExecutor, Id> {
  /** App-role database (hims_app). Owner connections bypass RLS and would prove nothing. */
  db: TDb;
  /** Two distinct tenant contexts; random tenants by default. */
  tenants?: readonly [TenantContext, TenantContext];
  /** Create one record as the current tenant; return what read/update/remove need to find it. */
  create: (tx: TransactionOf<TDb>, context: TenantContext) => Promise<Id>;
  /** Fetch the record. Anything "empty" (undefined, null, []) counts as not visible. */
  read: (tx: TransactionOf<TDb>, id: Id, context: TenantContext) => Promise<unknown>;
  /** Try to modify the record. May return or throw; only the effect on the record is checked. */
  update?: (tx: TransactionOf<TDb>, id: Id, context: TenantContext) => Promise<unknown>;
  /** Try to delete the record. May return or throw; only the effect is checked. */
  remove?: (tx: TransactionOf<TDb>, id: Id, context: TenantContext) => Promise<unknown>;
}

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || (Array.isArray(value) && value.length === 0);

const randomTenants = (): readonly [TenantContext, TenantContext] => [
  { tenantId: randomUUID() },
  { tenantId: randomUUID() },
];

/** Run fn as tenant; a thrown error counts as "blocked", which is what we want. */
async function attempt(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch {
    // Rejected by RLS or by the repository (e.g. RecordNotFoundError): both mean "denied".
  }
}

/**
 * Each operation receives the open tenant transaction and the acting tenant context, so it can
 * drive a repository (use tx) or an HTTP endpoint (use context to pick that tenant's session).
 *
 * Asserts, through any repository-level operations, that tenant A cannot read, update or
 * delete tenant B's record, while B still can read it. Framework-agnostic: throws
 * node:assert AssertionError on a leak, so it works under Vitest, Jest or node:test.
 */
export async function assertTenantIsolation<TDb extends DbExecutor, Id>(
  scenario: IsolationScenario<TDb, Id>,
): Promise<void> {
  const [a, b] = scenario.tenants ?? randomTenants();
  assert.notEqual(a.tenantId, b.tenantId, 'tenants must differ');
  const as = <T>(context: TenantContext, fn: (tx: TransactionOf<TDb>) => Promise<T>) =>
    withTenant(scenario.db, context, fn);

  const bId = await as(b, (tx) => scenario.create(tx, b));
  await as(a, (tx) => scenario.create(tx, a));
  const original = await as(b, (tx) => scenario.read(tx, bId, b));
  assert.ok(!isEmpty(original), 'tenant B must be able to read its own record (fixture check)');

  assert.ok(
    isEmpty(await as(a, (tx) => scenario.read(tx, bId, a))),
    "tenant A can read tenant B's record",
  );

  if (scenario.update) {
    const update = scenario.update;
    await attempt(() => as(a, (tx) => update(tx, bId, a)));
    assert.deepEqual(
      await as(b, (tx) => scenario.read(tx, bId, b)),
      original,
      "tenant A changed tenant B's record",
    );
  }

  if (scenario.remove) {
    const remove = scenario.remove;
    await attempt(() => as(a, (tx) => remove(tx, bId, a)));
    assert.ok(
      !isEmpty(await as(b, (tx) => scenario.read(tx, bId, b))),
      "tenant A deleted tenant B's record",
    );
  }
}

export type TenantTable = PgTable & { id: PgColumn; tenantId: PgColumn };

export interface TableIsolationOptions<TDb extends DbExecutor, T extends TenantTable> {
  db: TDb;
  table: T;
  /** Insert values for one valid row (tenant_id is filled from context). */
  values: () => T['$inferInsert'];
  /** A change to try on the other tenant's row, e.g. { name: 'hijacked' }. */
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- concrete per table at call site
  change: PgUpdateSetSource<T>;
  tenants?: readonly [TenantContext, TenantContext];
}

/**
 * Table-level isolation check for any table built on tenantColumns()/branchColumns():
 * cross-tenant read/update/delete (via assertTenantIsolation), plus the write-side guarantees
 * only RLS WITH CHECK gives: no inserting rows for another tenant, no moving a row to another
 * tenant, and nothing visible or writable without a tenant context.
 */
export async function assertTableTenantIsolation<TDb extends DbExecutor, T extends TenantTable>(
  options: TableIsolationOptions<TDb, T>,
): Promise<void> {
  const { db, table, change } = options;
  const source: PgTable = table;
  const tenants = options.tenants ?? randomTenants();
  const [a, b] = tenants;

  const insert = async (tx: DbExecutor, values: T['$inferInsert']): Promise<string> => {
    const [row] = await tx.insert(table).values(values).returning({ id: table.id });
    assert.ok(row, 'insert returned no row');
    return row.id as string;
  };

  await assertTenantIsolation({
    db,
    tenants,
    create: (tx) => insert(tx, options.values()),
    read: (tx, id) => tx.select().from(source).where(eq(table.id, id)),
    update: (tx, id) => tx.update(table).set(change).where(eq(table.id, id)),
    remove: (tx, id) => tx.delete(table).where(eq(table.id, id)),
  });

  // No RETURNING on the write probes: RETURNING also applies the read policy and would mask a
  // policy whose WITH CHECK is missing or too loose.
  const foreign = await pgErrorOf(
    withTenant(db, a, (tx) =>
      tx.insert(table).values({ ...options.values(), tenantId: b.tenantId }),
    ),
  ).catch(() => undefined);
  assert.equal(foreign?.code, RLS_VIOLATION, "tenant A inserted a row into tenant B's data");

  const ownId = await withTenant(db, a, (tx) => insert(tx, options.values()));
  const moved = await pgErrorOf(
    withTenant(db, a, (tx) =>
      tx
        .update(table)
        // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- concrete per table at call site
        .set({ tenantId: b.tenantId } as PgUpdateSetSource<T>)
        .where(eq(table.id, ownId)),
    ),
  ).catch(() => undefined);
  assert.equal(moved?.code, RLS_VIOLATION, 'tenant A moved its row to tenant B');

  const noContext = await db.select().from(source);
  assert.equal(noContext.length, 0, 'rows are visible without a tenant context');
  const contextless = await pgErrorOf(
    db.insert(table).values({ ...options.values(), tenantId: a.tenantId }),
  )
    .then((e) => e.code)
    .catch(() => undefined);
  assert.equal(contextless, RLS_VIOLATION, 'a row was written without a tenant context');
}
