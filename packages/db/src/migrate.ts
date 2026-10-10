import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

import { MigrationRoleError } from './errors.js';
import { assertTenantTablesHaveRls } from './tenancy/rls.js';

/** The single, ordered migrations folder for the whole database (infra + feature tables). */
export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

/** The role the API runs as; it must never own or migrate the schema. */
export const APP_ROLE = 'hims_app';

// Arbitrary constant; serialises concurrent migrators (e.g. several API replicas on deploy).
const MIGRATION_LOCK_KEY = 4_815_162_342;

export interface MigrateOptions {
  /** Owner role over a DIRECT Postgres connection (:5432), never PgBouncer. */
  connectionString: string;
  migrationsFolder?: string;
}

/**
 * Applies pending migrations as the owner role.
 *
 * Direct connection only: the session-level advisory lock below is meaningless through
 * PgBouncer transaction pooling, and DDL must not share pooled server connections.
 * Drizzle applies all pending migrations in one transaction, so a failure leaves nothing half-done.
 * Afterwards every tenant table must be under forced RLS, or this throws TenantRlsMissingError.
 */
export async function runMigrations(options: MigrateOptions): Promise<void> {
  const client = new pg.Client({
    connectionString: options.connectionString,
    application_name: 'hims-migrate',
  });
  await client.connect();
  try {
    const { rows } = await client.query<{ role: string }>('select current_user as role');
    const role = rows[0]?.role ?? '';
    if (role === APP_ROLE) throw new MigrationRoleError(role);

    await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: options.migrationsFolder ?? migrationsFolder });
      // Fail the deploy loudly if any tenant table is not under forced RLS.
      await assertTenantTablesHaveRls(db);
    } finally {
      await client.query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } finally {
    await client.end();
  }
}
