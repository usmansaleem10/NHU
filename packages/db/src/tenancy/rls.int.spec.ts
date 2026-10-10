import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database } from '../client.js';
import { branchColumns, tenantColumns } from '../columns/base.js';
import { pgErrorOf, RLS_VIOLATION } from '../testing/pg-error.js';
import {
  createTables,
  execAsOwner,
  startTestDatabase,
  type TestDatabase,
} from '../testing/postgres.js';
import { assertTenantTablesHaveRls, findTenantTablesWithoutRls, tenantRlsSql } from './rls.js';
import { withTenant } from './with-tenant.js';

const notes = pgTable('notes', { ...tenantColumns(), body: text('body').notNull() });
const beds = pgTable('beds', { ...branchColumns(), label: text('label').notNull() });

const A = randomUUID();
const B = randomUUID();
const A1 = randomUUID(); // branches of tenant A
const A2 = randomUUID();

let pgc: TestDatabase;
let app: Database; // hims_app: what the API uses
let single: Database; // hims_app, one connection: proves nothing leaks between transactions

beforeAll(async () => {
  pgc = await startTestDatabase();
  await createTables(pgc.ownerUrl, { notes, beds }, [
    ...tenantRlsSql(notes),
    ...tenantRlsSql(beds, { branchScoped: true }),
  ]);
  app = createDatabase({ connectionString: pgc.appUrl });
  single = createDatabase({ connectionString: pgc.appUrl, max: 1 });

  await withTenant(app.db, { tenantId: A }, (tx) =>
    tx.insert(notes).values([{ body: 'a-1' }, { body: 'a-2' }]),
  );
  await withTenant(app.db, { tenantId: B }, (tx) => tx.insert(notes).values({ body: 'b-1' }));
  await withTenant(app.db, { tenantId: A, branchId: A1 }, (tx) =>
    tx.insert(beds).values({ label: 'A1-bed' }),
  );
  await withTenant(app.db, { tenantId: A, branchId: A2 }, (tx) =>
    tx.insert(beds).values({ label: 'A2-bed' }),
  );
});

afterAll(async () => {
  await app.close();
  await single.close();
  await pgc.stop();
});

const notesOf = (tenantId: string) =>
  withTenant(app.db, { tenantId }, (tx) => tx.select().from(notes));

describe('tenant isolation (RLS)', () => {
  it('returns no rows when no tenant context is set', async () => {
    expect(await app.db.select().from(notes)).toEqual([]);
  });

  it('does not leak the context to the next transaction on the same connection', async () => {
    const inside = await withTenant(single.db, { tenantId: A }, (tx) => tx.select().from(notes));
    const after = await single.db.select().from(notes);

    expect(inside).toHaveLength(2);
    expect(after).toEqual([]);
  });

  it('shows each tenant only its own rows', async () => {
    expect((await notesOf(A)).map((n) => n.body).sort()).toEqual(['a-1', 'a-2']);
    expect((await notesOf(B)).map((n) => n.body)).toEqual(['b-1']);
  });

  it('rejects inserting a row for another tenant (WITH CHECK)', async () => {
    const error = await pgErrorOf(
      withTenant(app.db, { tenantId: A }, (tx) =>
        tx.insert(notes).values({ tenantId: B, body: 'smuggled' }),
      ),
    );
    expect(error.code).toBe(RLS_VIOLATION);
  });

  it('rejects moving an own row to another tenant', async () => {
    const error = await pgErrorOf(
      withTenant(app.db, { tenantId: A }, (tx) =>
        tx.update(notes).set({ tenantId: B }).where(eq(notes.body, 'a-1')),
      ),
    );
    expect(error.code).toBe(RLS_VIOLATION);
  });

  it("cannot update or delete another tenant's rows", async () => {
    const [bNote] = await notesOf(B);
    if (!bNote) throw new Error('fixture missing');

    const touched = await withTenant(app.db, { tenantId: A }, async (tx) => {
      const updated = await tx
        .update(notes)
        .set({ body: 'hijacked' })
        .where(eq(notes.id, bNote.id))
        .returning();
      const deleted = await tx.delete(notes).where(eq(notes.id, bNote.id)).returning();
      return updated.length + deleted.length;
    });

    expect(touched).toBe(0);
    expect(await notesOf(B)).toEqual([bNote]);
  });

  it('cannot be switched off by the app role', async () => {
    const rowSecurityOff = await pgErrorOf(
      app.db.transaction(async (tx) => {
        await tx.execute(sql`set local row_security = off`);
        return tx.select().from(notes);
      }),
    );
    const disable = await pgErrorOf(
      app.db.execute(sql`alter table notes disable row level security`),
    );

    expect(rowSecurityOff.message).toMatch(/row-level security/);
    expect(disable.message).toMatch(/must be owner/);
  });
});

describe('branch-scoped tables', () => {
  const bedsIn = (context: { tenantId: string; branchId?: string }) =>
    withTenant(app.db, context, (tx) => tx.select({ label: beds.label }).from(beds));

  it('confine a branch context to its branch, while tenant-wide context sees all branches', async () => {
    expect(await bedsIn({ tenantId: A, branchId: A1 })).toEqual([{ label: 'A1-bed' }]);
    expect((await bedsIn({ tenantId: A })).map((b) => b.label).sort()).toEqual([
      'A1-bed',
      'A2-bed',
    ]);
    expect(await bedsIn({ tenantId: B })).toEqual([]);
  });

  it('reject writing into another branch from a branch context', async () => {
    const error = await pgErrorOf(
      withTenant(app.db, { tenantId: A, branchId: A1 }, (tx) =>
        tx.insert(beds).values({ branchId: A2, label: 'wrong-branch' }),
      ),
    );
    expect(error.code).toBe(RLS_VIOLATION);
  });
});

describe('tenant RLS guard', () => {
  it('passes for every table the real migrations create', async () => {
    const owner = createDatabase({ connectionString: pgc.ownerUrl });
    try {
      await expect(assertTenantTablesHaveRls(owner.db)).resolves.toBeUndefined();
    } finally {
      await owner.close();
    }
  });

  it('flags a tenant table that forgot RLS, forgot FORCE, or has no policy', async () => {
    await execAsOwner(pgc.ownerUrl, [
      'create table forgot_rls (id uuid primary key, tenant_id uuid not null)',
      'create table forgot_force (id uuid primary key, tenant_id uuid not null)',
      'alter table forgot_force enable row level security',
      'create table no_tenant (id uuid primary key)',
    ]);
    const owner = createDatabase({ connectionString: pgc.ownerUrl });
    try {
      expect(await findTenantTablesWithoutRls(owner.db)).toEqual([
        { table: 'public.forgot_force', problems: ['rls_not_forced', 'no_policy'] },
        { table: 'public.forgot_rls', problems: ['rls_disabled', 'rls_not_forced', 'no_policy'] },
      ]);
    } finally {
      await owner.close();
      await execAsOwner(pgc.ownerUrl, ['drop table forgot_rls, forgot_force, no_tenant']);
    }
  });
});
