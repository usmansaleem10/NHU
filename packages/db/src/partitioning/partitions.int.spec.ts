import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { numeric, pgTable, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase, type Database } from '../client.js';
import { tenantIdColumn, uuidV7 } from '../columns/base.js';
import { assertTenantTablesHaveRls, tenantRlsSql } from '../tenancy/rls.js';
import { withTenant } from '../tenancy/with-tenant.js';
import { pgErrorOf } from '../testing/pg-error.js';
import { execAsOwner, startTestDatabase, type TestDatabase } from '../testing/containers.js';
import { assertTableTenantIsolation } from '../testing/tenant-isolation.js';
import {
  ensureMonthlyPartitions,
  maintainPartitions,
  missingMonthlyPartitions,
  PartitionMaintenanceError,
} from './partitions.js';

// Shape of a high-volume table: the partition key must be part of the primary key.
const vitals = pgTable(
  'vitals',
  {
    id: uuidV7('id'),
    tenantId: tenantIdColumn(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    pulse: numeric('pulse').notNull(),
  },
  (t) => [primaryKey({ columns: [t.id, t.recordedAt] })],
);

const NOW = new Date('2026-11-20T10:00:00Z');

let pgc: TestDatabase;
let app: Database;
let owner: Database;

const partitionsOf = async (table: string): Promise<string[]> => {
  const result = await owner.db.execute<{ name: string }>(sql`
    select c.relname as name from pg_inherits i join pg_class c on c.oid = i.inhrelid
     where i.inhparent = ${table}::regclass order by 1`);
  return result.rows.map((r) => r.name);
};

beforeAll(async () => {
  pgc = await startTestDatabase();
  // drizzle-kit cannot emit PARTITION BY: partitioned tables are written in custom SQL.
  await execAsOwner(pgc.ownerUrl, [
    `create table vitals (
       id uuid not null, tenant_id uuid not null default app_current_tenant_id(),
       recorded_at timestamptz not null, pulse numeric not null,
       primary key (id, recorded_at)
     ) partition by range (recorded_at)`,
    ...tenantRlsSql('vitals'),
    `create table audit_log (id uuid, at timestamptz not null) partition by range (at)`,
    'create table not_partitioned (id uuid primary key, at timestamptz)',
    // Shapes the SECURITY DEFINER function must refuse:
    'create table expr_key (at timestamp not null) partition by range ((at::date))',
    'create schema other',
    'grant usage on schema other to hims_app', // so the function's own check is what refuses
    'create table other.foreign_schema (at timestamptz not null) partition by range (at)',
    `create table ${'x'.repeat(56)} (at timestamptz not null) partition by range (at)`,
  ]);
  await execAsOwner(pgc.superUrl, [
    'create table not_owned (at timestamptz not null) partition by range (at)',
  ]);
  app = createDatabase({ connectionString: pgc.appUrl });
  owner = createDatabase({ connectionString: pgc.superUrl }); // raw inspection: bypasses RLS
});

afterAll(async () => {
  await app.close();
  await owner.close();
  await pgc.stop();
});

describe('ensureMonthlyPartitions', () => {
  it('pre-creates this month and the next 3 (across a year boundary), as the app role', async () => {
    expect(await ensureMonthlyPartitions(app.db, 'vitals', { from: NOW })).toBe(4);
    expect(await partitionsOf('vitals')).toEqual([
      'vitals_p202611',
      'vitals_p202612',
      'vitals_p202701',
      'vitals_p202702',
    ]);
  });

  it('is idempotent and only adds what is missing as time moves on', async () => {
    expect(await ensureMonthlyPartitions(app.db, 'vitals', { from: NOW })).toBe(0);
    expect(
      await ensureMonthlyPartitions(app.db, 'vitals', { from: new Date('2026-12-01T00:00:00Z') }),
    ).toBe(1);
    expect(await missingMonthlyPartitions(app.db, 'vitals', { from: NOW, monthsAhead: 4 })).toEqual(
      [],
    );
  });

  it('uses UTC month bounds: the last instant of a month and the first of the next split', async () => {
    const tenantId = randomUUID();
    await withTenant(app.db, { tenantId, branchId: 'all' }, (tx) =>
      tx.insert(vitals).values([
        { recordedAt: new Date('2026-11-30T23:59:59.999Z'), pulse: '72' },
        { recordedAt: new Date('2026-12-01T00:00:00Z'), pulse: '80' },
      ]),
    );
    const result = await owner.db.execute<{ partition: string }>(sql`
      select tableoid::regclass::text as partition from vitals
       where tenant_id = ${tenantId} order by recorded_at`);
    expect(result.rows.map((r) => r.partition)).toEqual(['vitals_p202611', 'vitals_p202612']);
  });

  it('rejects rows for a month with no partition (why partitions are created ahead)', async () => {
    const error = await pgErrorOf(
      withTenant(app.db, { tenantId: randomUUID(), branchId: 'all' }, (tx) =>
        tx.insert(vitals).values({ recordedAt: new Date('2030-01-01T00:00:00Z'), pulse: '1' }),
      ),
    );
    expect(error.code).toBe('23514'); // no partition of relation found for row
  });

  it('creates each partition once when several workers run the job at the same moment', async () => {
    const from = new Date('2028-06-01T00:00:00Z');
    const created = await Promise.all(
      Array.from({ length: 5 }, () => ensureMonthlyPartitions(app.db, 'audit_log', { from })),
    );
    expect(created.reduce((sum, n) => sum + n, 0)).toBe(4);
    expect(await missingMonthlyPartitions(app.db, 'audit_log', { from })).toEqual([]);
  });

  it('refuses tables that are not range-partitioned by time', async () => {
    const error = await pgErrorOf(ensureMonthlyPartitions(app.db, 'not_partitioned'));
    expect(error.code).toBe('22023');
  });
});

describe('app_ensure_monthly_partitions hardening (SECURITY DEFINER)', () => {
  const refusal = (parent: string) =>
    pgErrorOf(app.db.execute(sql`select app_ensure_monthly_partitions(${parent}::regclass)`));

  it.each([
    ['an expression partition key', 'expr_key'],
    ['a schema outside the allowlist', 'other.foreign_schema'],
    ['a table not owned by the function owner', 'not_owned'],
    ['a name too long for the partition suffix', 'x'.repeat(56)],
  ])('refuses %s with 22023 and creates nothing', async (_case, parent) => {
    expect((await refusal(parent)).code).toBe('22023');
    const created = await owner.db.execute(
      sql`select 1 from pg_inherits where inhparent = ${parent}::regclass`,
    );
    expect(created.rowCount).toBe(0);
  });

  it("refuses the caller's own temporary partitioned table", async () => {
    const client = await app.pool.connect();
    try {
      await client.query(
        'create temp table scratch (at timestamptz not null) partition by range (at)',
      );
      const error = await client
        .query("select app_ensure_monthly_partitions('pg_temp.scratch'::regclass)")
        .then(
          () => undefined,
          (e: unknown) => e as { code?: string },
        );
      expect(error?.code).toBe('22023');
    } finally {
      client.release(true);
    }
  });

  it('pins search_path to pg_catalog then pg_temp, and the app role is still no superuser', async () => {
    const config = await owner.db.execute<{ config: string[] }>(sql`
      select proconfig as config from pg_proc where proname = 'app_ensure_monthly_partitions'`);
    expect(config.rows[0]?.config).toContain('search_path=pg_catalog, pg_temp');
    const role = await owner.db.execute<{ rolsuper: boolean }>(
      sql`select rolsuper from pg_roles where rolname = 'hims_app'`,
    );
    expect(role.rows[0]?.rolsuper).toBe(false);
  });
});

describe('row-level security on partitioned tables', () => {
  it('isolates tenants through the parent', async () => {
    await assertTableTenantIsolation({
      db: app.db,
      table: vitals,
      values: () => ({ recordedAt: new Date('2026-12-15T08:00:00Z'), pulse: '70' }),
      change: { pulse: '999' },
    });
  });

  it('returns nothing when a partition is queried directly, even for its own tenant', async () => {
    const tenantId = randomUUID();
    const [viaParent, direct] = await withTenant(
      app.db,
      { tenantId, branchId: 'all' },
      async (tx) => {
        await tx
          .insert(vitals)
          .values({ recordedAt: new Date('2027-01-05T00:00:00Z'), pulse: '1' });
        return [
          await tx.execute(sql`select 1 from vitals where tenant_id = ${tenantId}`),
          await tx.execute(sql`select 1 from vitals_p202701`),
        ];
      },
    );
    expect(viaParent.rowCount).toBe(1);
    expect(direct.rowCount).toBe(0);
  });

  it('keeps the RLS guard green for every partition created by the job', async () => {
    await expect(assertTenantTablesHaveRls(owner.db)).resolves.toBeUndefined();
  });
});

describe('maintainPartitions (the scheduled job)', () => {
  it('maintains every table it can, then fails loudly naming the ones it could not', async () => {
    const job = maintainPartitions(app.db, ['audit_log', 'not_partitioned', 'vitals'], {
      from: new Date('2027-03-10T00:00:00Z'),
    });

    await expect(job).rejects.toBeInstanceOf(PartitionMaintenanceError);
    await expect(job).rejects.toMatchObject({ failures: [{ table: 'not_partitioned' }] });
    for (const table of ['audit_log', 'vitals']) {
      expect(
        await missingMonthlyPartitions(app.db, table, { from: new Date('2027-03-10T00:00:00Z') }),
      ).toEqual([]);
    }
  });
});
