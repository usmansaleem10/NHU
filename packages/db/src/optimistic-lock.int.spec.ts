import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database } from './client.js';
import { tenantColumns } from './columns/base.js';
import { RecordNotFoundError, StaleVersionError } from './errors.js';
import { updateWithVersion } from './optimistic-lock.js';
import { createTables, startTestDatabase, type TestDatabase } from './testing/containers.js';

const widgets = pgTable('widgets', { ...tenantColumns(), name: text('name').notNull() });

const tenantId = randomUUID();
const userId = randomUUID();
const editorId = randomUUID();

let pgc: TestDatabase;
let owner: Database;

/** Minimal context (withTenant arrives in F0-DB-02): transaction-local settings. */
const asUser = <T>(user: string, fn: (tx: Database['db']) => Promise<T>) =>
  owner.db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.tenant_id', ${tenantId}, true), set_config('app.user_id', ${user}, true)`,
    );
    return fn(tx);
  });

beforeAll(async () => {
  pgc = await startTestDatabase();
  await createTables(pgc.ownerUrl, { widgets });
  owner = createDatabase({ connectionString: pgc.ownerUrl });
});

afterAll(async () => {
  await owner.close();
  await pgc.stop();
});

describe('base columns', () => {
  it('fills id (uuid v7), tenant, actor, timestamps and version from the transaction context', async () => {
    const [row] = await asUser(userId, (tx) =>
      tx.insert(widgets).values({ name: 'bed' }).returning(),
    );

    expect(row).toMatchObject({ tenantId, createdBy: userId, updatedBy: userId, version: 1 });
    expect(row?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a row written with no tenant context', async () => {
    await expect(owner.db.insert(widgets).values({ name: 'orphan' })).rejects.toThrow(/tenant_id/);
  });
});

describe('updateWithVersion', () => {
  const insertWidget = async () => {
    const [row] = await asUser(userId, (tx) =>
      tx.insert(widgets).values({ name: 'v1' }).returning(),
    );
    if (!row) throw new Error('insert returned nothing');
    return row;
  };

  it('applies the update, bumps version and records the editor', async () => {
    const created = await insertWidget();

    const updated = await asUser(editorId, (tx) =>
      updateWithVersion(tx, widgets, { id: created.id, expectedVersion: 1 }, { name: 'v2' }),
    );

    expect(updated).toMatchObject({ name: 'v2', version: 2, updatedBy: editorId });
    expect(updated.createdBy).toBe(userId);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it('rejects a stale version and leaves the row untouched', async () => {
    const created = await insertWidget();
    await asUser(editorId, (tx) =>
      updateWithVersion(tx, widgets, { id: created.id, expectedVersion: 1 }, { name: 'first' }),
    );

    const stale = asUser(editorId, (tx) =>
      updateWithVersion(tx, widgets, { id: created.id, expectedVersion: 1 }, { name: 'second' }),
    );

    await expect(stale).rejects.toBeInstanceOf(StaleVersionError);
    await expect(stale).rejects.toMatchObject({ expectedVersion: 1, actualVersion: 2 });
    const [current] = await owner.db.select().from(widgets).where(eq(widgets.id, created.id));
    expect(current).toMatchObject({ name: 'first', version: 2 });
  });

  it('only one of two concurrent writers holding the same version wins', async () => {
    const created = await insertWidget();
    const write = (name: string) =>
      asUser(editorId, (tx) =>
        updateWithVersion(tx, widgets, { id: created.id, expectedVersion: 1 }, { name }),
      );

    const results = await Promise.allSettled([write('a'), write('b')]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected?.reason).toBeInstanceOf(StaleVersionError);
  });

  it('reports a missing row as not found, not as a conflict', async () => {
    await expect(
      asUser(editorId, (tx) =>
        updateWithVersion(tx, widgets, { id: randomUUID(), expectedVersion: 1 }, { name: 'x' }),
      ),
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });
});
