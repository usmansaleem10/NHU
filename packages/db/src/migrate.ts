import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import pg from 'pg';

import { MigrationRoleError } from './errors.js';
import { assertTenantTablesHaveRls } from './tenancy/rls.js';

/** The single, ordered migrations folder for the whole database (infra + feature tables). */
export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

/** The role the API runs as; it must never own or migrate the schema. */
export const APP_ROLE = 'hims_app';

/** The non-superuser role that owns the schema and runs migrations. */
export const OWNER_ROLE = 'hims_owner';

// Arbitrary constant; serialises concurrent migrators (e.g. several API replicas on deploy).
const MIGRATION_LOCK_KEY = 4_815_162_342;

export interface MigrateOptions {
  /** Owner role (hims_owner) over a DIRECT Postgres connection (:5432), never PgBouncer. */
  connectionString: string;
  migrationsFolder?: string;
}

/**
 * Applies pending drizzle-kit migrations as the owner role, in ONE transaction that also runs
 * the tenant RLS guard: a migration that leaves a tenant table without forced RLS rolls back
 * with everything else in the batch (TenantRlsMissingError) instead of being committed.
 *
 * - Refuses hims_app and any superuser/BYPASSRLS role: objects must be owned by the
 *   non-superuser owner, or SECURITY DEFINER functions and FORCE RLS lose their meaning.
 * - pg_advisory_xact_lock serialises concurrent deployers and is released by COMMIT/ROLLBACK.
 *   Direct connection only: DDL must not share PgBouncer-pooled server connections.
 * - Statements that cannot run in a transaction (CREATE INDEX CONCURRENTLY) need a separate,
 *   non-transactional path; they are not supported here.
 *
 * Uses drizzle-kit's folder format and drizzle's bookkeeping table (drizzle.__drizzle_migrations).
 */
export async function runMigrations(options: MigrateOptions): Promise<void> {
  const migrations = readMigrationFiles({
    migrationsFolder: options.migrationsFolder ?? migrationsFolder,
  });
  const client = new pg.Client({
    connectionString: options.connectionString,
    application_name: 'hims-migrate',
  });
  await client.connect();
  try {
    const { rows } = await client.query<{ role: string; privileged: boolean }>(
      `select current_user as role, (rolsuper or rolbypassrls) as privileged
         from pg_roles where rolname = current_user`,
    );
    const role = rows[0]?.role ?? '';
    if (role === APP_ROLE || rows[0]?.privileged !== false) throw new MigrationRoleError(role);

    await client.query('begin');
    try {
      await client.query('select pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
      await client.query('create schema if not exists drizzle');
      await client.query(`create table if not exists drizzle.__drizzle_migrations (
        id serial primary key, hash text not null, created_at bigint)`);
      const last = await client.query<{ created_at: string }>(
        'select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1',
      );
      const lastMillis = Number(last.rows[0]?.created_at ?? -1);

      for (const migration of migrations) {
        if (migration.folderMillis <= lastMillis) continue;
        for (const statement of migration.sql) {
          if (statement.trim()) await client.query(statement);
        }
        await client.query(
          'insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)',
          [migration.hash, migration.folderMillis],
        );
      }

      await assertTenantTablesHaveRls(drizzle(client));
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => undefined); // never mask the original error
      throw error;
    }
  } finally {
    await client.end();
  }
}
