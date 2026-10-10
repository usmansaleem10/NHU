import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import pg from 'pg';

/**
 * Anything you can run a query on: the database or an open transaction. Repositories accept
 * this so the same code runs inside withTenant's transaction.
 */
export type DbExecutor = PgDatabase<NodePgQueryResultHKT, Record<string, unknown>>;

export interface DatabaseOptions {
  /**
   * The API uses the app role through PgBouncer (transaction pooling), e.g.
   * postgres://hims_app:...@pgbouncer:6432/hims. Never the owner role.
   */
  connectionString: string;
  /** Pool size per process. PgBouncer multiplexes these onto fewer server connections. */
  max?: number;
  applicationName?: string;
}

export interface Database<TSchema extends Record<string, unknown> = Record<string, never>> {
  db: NodePgDatabase<TSchema>;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDatabase<TSchema extends Record<string, unknown> = Record<string, never>>(
  options: DatabaseOptions,
  schema?: TSchema,
): Database<TSchema> {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    max: options.max ?? 10,
    application_name: options.applicationName ?? 'hims',
  });
  const db = schema ? drizzle(pool, { schema }) : drizzle(pool);
  return {
    db: db as NodePgDatabase<TSchema>,
    pool,
    close: () => pool.end(),
  };
}
