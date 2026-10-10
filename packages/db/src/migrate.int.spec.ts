import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MigrationRoleError } from './errors.js';
import { runMigrations } from './migrate.js';
import { startTestDatabase, type TestDatabase } from './testing/postgres.js';

let pgc: TestDatabase;

const withOwner = async <T>(url: string, fn: (client: pg.Client) => Promise<T>): Promise<T> => {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

const appliedMigrations = async (): Promise<number> => {
  const { rows } = await withOwner(pgc.ownerUrl, (c) =>
    c.query<{ n: string }>('select count(*) as n from drizzle.__drizzle_migrations'),
  );
  return Number(rows[0]?.n);
};

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

  it('applies every migration on an empty database, and a re-run applies nothing', async () => {
    await runMigrations({ connectionString: pgc.ownerUrl });
    const first = await appliedMigrations();
    expect(first).toBeGreaterThan(0);

    await runMigrations({ connectionString: pgc.ownerUrl });
    expect(await appliedMigrations()).toBe(first);
  });

  it('serialises concurrent migrators on a fresh database (e.g. replicas deploying at once)', async () => {
    await withOwner(pgc.ownerUrl, (c) => c.query('create database concurrent'));
    const fresh = new URL(pgc.ownerUrl);
    fresh.pathname = '/concurrent';

    await Promise.all([
      runMigrations({ connectionString: fresh.toString() }),
      runMigrations({ connectionString: fresh.toString() }),
      runMigrations({ connectionString: fresh.toString() }),
    ]);

    const { rows } = await withOwner(fresh.toString(), (c) =>
      c.query<{ n: string }>('select count(*) as n from drizzle.__drizzle_migrations'),
    );
    expect(Number(rows[0]?.n)).toBe(await appliedMigrations());
  });
});
