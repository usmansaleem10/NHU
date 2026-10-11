import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MigrationRoleError } from './errors.js';
import { migrationsFolder, runMigrations } from './migrate.js';
import { TenantRlsMissingError } from './tenancy/rls.js';
import { startTestDatabase, type TestDatabase } from './testing/containers.js';

let pgc: TestDatabase;

const withClient = async <T>(url: string, fn: (client: pg.Client) => Promise<T>): Promise<T> => {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

const appliedMigrations = async (url = pgc.ownerUrl): Promise<number> => {
  const { rows } = await withClient(url, (c) =>
    c.query<{ n: string }>('select count(*) as n from drizzle.__drizzle_migrations'),
  );
  return Number(rows[0]?.n);
};

/** A copy of the real migrations plus one extra hand-written migration. */
function migrationsWith(tag: string, sql: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'hims-migrations-'));
  cpSync(migrationsFolder, dir, { recursive: true });
  const journalPath = join(dir, 'meta', '_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[];
  };
  journal.entries.push({
    idx: journal.entries.length,
    version: '7',
    when: Date.now(),
    tag,
    breakpoints: true,
  });
  writeFileSync(journalPath, JSON.stringify(journal));
  writeFileSync(join(dir, `${tag}.sql`), sql);
  return dir;
}

beforeAll(async () => {
  pgc = await startTestDatabase({ migrate: false });
});

afterAll(async () => {
  await pgc.stop();
});

describe('runMigrations', () => {
  it('refuses to run as the app role', async () => {
    await expect(runMigrations({ connectionString: pgc.appUrl })).rejects.toBeInstanceOf(
      MigrationRoleError,
    );
  });

  it('refuses to run as a superuser (objects must be owned by the non-superuser owner)', async () => {
    await expect(runMigrations({ connectionString: pgc.superUrl })).rejects.toBeInstanceOf(
      MigrationRoleError,
    );
  });

  it('applies every migration on an empty database, and a re-run applies nothing', async () => {
    await runMigrations({ connectionString: pgc.ownerUrl });
    const first = await appliedMigrations();
    expect(first).toBeGreaterThan(0);

    await runMigrations({ connectionString: pgc.ownerUrl });
    expect(await appliedMigrations()).toBe(first);
  });

  it('rolls back the whole batch when a migration leaves a tenant table without RLS', async () => {
    const before = await appliedMigrations();
    const folder = migrationsWith(
      '9000_forgot_rls',
      'CREATE TABLE "forgot_rls" ("id" uuid PRIMARY KEY, "tenant_id" uuid NOT NULL);',
    );

    await expect(
      runMigrations({ connectionString: pgc.ownerUrl, migrationsFolder: folder }),
    ).rejects.toBeInstanceOf(TenantRlsMissingError);

    const { rows } = await withClient(pgc.ownerUrl, (c) =>
      c.query<{ t: string | null }>(`select to_regclass('public.forgot_rls')::text as t`),
    );
    expect(rows[0]?.t).toBeNull();
    expect(await appliedMigrations()).toBe(before);
  });

  it('serialises concurrent migrators on a fresh database (e.g. replicas deploying at once)', async () => {
    await withClient(pgc.superUrl, async (c) => {
      await c.query('create database concurrent owner hims_owner');
    });
    const fresh = new URL(pgc.ownerUrl);
    fresh.pathname = '/concurrent';

    await Promise.all([
      runMigrations({ connectionString: fresh.toString() }),
      runMigrations({ connectionString: fresh.toString() }),
      runMigrations({ connectionString: fresh.toString() }),
    ]);

    expect(await appliedMigrations(fresh.toString())).toBe(await appliedMigrations());
  });
});
