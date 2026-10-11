import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import pg from 'pg';

import { APP_ROLE, OWNER_ROLE, runMigrations } from '../migrate.js';

/** Same image as compose.yaml (Debian/glibc, not alpine). */
export const POSTGRES_IMAGE = 'postgres:17.11';

const ROLES_SQL = 'docker/postgres/init/01-roles.sql';

export interface TestDatabase {
  /** Bootstrap superuser `hims` (bypasses RLS). Raw inspection in tests only. */
  superUrl: string;
  /** Owner role `hims_owner` (not superuser, subject to FORCE RLS): migrations and fixture DDL. */
  ownerUrl: string;
  /** App role `hims_app` (NOBYPASSRLS): what the API uses. Assert behaviour through this. */
  appUrl: string;
  stop: () => Promise<void>;
}

export interface StartTestDatabaseOptions {
  /** Apply the @hims/db migrations folder after start. Default true. */
  migrate?: boolean;
}

/**
 * Starts a throwaway Postgres 17 with the same roles as the dev stack (it runs the repo's own
 * docker/postgres/init/01-roles.sql, so test and dev roles cannot drift) and applies all migrations.
 */
export async function startTestDatabase(
  options: StartTestDatabaseOptions = {},
): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withUsername('hims')
    .withPassword('hims')
    .withDatabase('hims')
    .withCopyFilesToContainer([
      { source: findRepoFile(ROLES_SQL), target: '/docker-entrypoint-initdb.d/01-roles.sql' },
    ])
    .start();

  const superUrl = container.getConnectionUri();
  const asRole = (role: string) => {
    const url = new URL(superUrl);
    url.username = role;
    url.password = role;
    return url.toString();
  };
  const ownerUrl = asRole(OWNER_ROLE);

  if (options.migrate ?? true) await runMigrations({ connectionString: ownerUrl });

  return {
    superUrl,
    ownerUrl,
    appUrl: asRole(APP_ROLE),
    stop: async () => {
      await container.stop();
    },
  };
}

/**
 * Creates tables from Drizzle definitions using drizzle-kit's own DDL generator, so test
 * fixtures get exactly the DDL `db:generate` would emit. Runs as the owner.
 */
export async function createTables(
  ownerUrl: string,
  tables: Record<string, unknown>,
  extraSql: readonly string[] = [],
): Promise<void> {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(tables));
  await execAsOwner(ownerUrl, [...statements, ...extraSql]);
}

/** Runs SQL statements in one transaction (pass ownerUrl for DDL so hims_app gets privileges). */
export async function execAsOwner(ownerUrl: string, statements: readonly string[]): Promise<void> {
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query('begin');
    for (const statement of statements) await client.query(statement);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

function findRepoFile(relative: string): string {
  let dir = import.meta.dirname;
  for (;;) {
    const candidate = join(dir, relative);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`${relative} not found above ${import.meta.dirname}`);
    dir = parent;
  }
}
