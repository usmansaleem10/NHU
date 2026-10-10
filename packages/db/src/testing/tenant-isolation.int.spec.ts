import { AssertionError } from 'node:assert';

import { eq } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database, type DbExecutor } from '../client.js';
import { tenantColumns } from '../columns/base.js';
import { updateWithVersion } from '../optimistic-lock.js';
import { tenantPredicate, tenantRlsSql } from '../tenancy/rls.js';
import { createTables, startTestDatabase, type TestDatabase } from './postgres.js';
import { assertTableTenantIsolation, assertTenantIsolation } from './tenant-isolation.js';

const documents = pgTable('documents', { ...tenantColumns(), title: text('title').notNull() });
const leaky = pgTable('leaky', { ...tenantColumns(), title: text('title').notNull() });
const readOnlyGuard = pgTable('read_only_guard', {
  ...tenantColumns(),
  title: text('title').notNull(),
});

/** A repository the way features will write them: plain functions over a transaction. */
const documentsRepository = {
  create: async (tx: DbExecutor, title: string) => {
    const [row] = await tx.insert(documents).values({ title }).returning();
    if (!row) throw new Error('insert returned nothing');
    return row;
  },
  findById: async (tx: DbExecutor, id: string) => {
    const [row] = await tx.select().from(documents).where(eq(documents.id, id));
    return row;
  },
  rename: (tx: DbExecutor, id: string, version: number, title: string) =>
    updateWithVersion(tx, documents, { id, expectedVersion: version }, { title }),
};

let pgc: TestDatabase;
let app: Database;

beforeAll(async () => {
  pgc = await startTestDatabase();
  await createTables(pgc.ownerUrl, { documents, leaky, readOnlyGuard }, [
    ...tenantRlsSql(documents),
    // Isolates reads but forgets the write check: a classic policy mistake.
    'alter table read_only_guard enable row level security',
    'alter table read_only_guard force row level security',
    `create policy sloppy on read_only_guard using (${tenantPredicate()}) with check (true)`,
  ]);
  app = createDatabase({ connectionString: pgc.appUrl });
});

afterAll(async () => {
  await app.close();
  await pgc.stop();
});

describe('assertTableTenantIsolation', () => {
  it('passes for a table under the standard tenant policy', async () => {
    await assertTableTenantIsolation({
      db: app.db,
      table: documents,
      values: () => ({ title: 'discharge summary' }),
      change: { title: 'hijacked' },
    });
  });

  it('fails for a tenant table without RLS', async () => {
    await expect(
      assertTableTenantIsolation({
        db: app.db,
        table: leaky,
        values: () => ({ title: 'x' }),
        change: { title: 'hijacked' },
      }),
    ).rejects.toThrow(AssertionError);
  });

  it('fails when the policy isolates reads but not writes', async () => {
    await expect(
      assertTableTenantIsolation({
        db: app.db,
        table: readOnlyGuard,
        values: () => ({ title: 'x' }),
        change: { title: 'hijacked' },
      }),
    ).rejects.toThrow(/inserted a row into tenant B/);
  });
});

describe('assertTenantIsolation with repository operations', () => {
  it("proves a repository cannot read, rename or see another tenant's document", async () => {
    await assertTenantIsolation({
      db: app.db,
      create: async (tx) => (await documentsRepository.create(tx, 'lab report')).id,
      read: (tx, id) => documentsRepository.findById(tx, id),
      update: (tx, id) => documentsRepository.rename(tx, id, 1, 'hijacked'),
    });
  });
});
