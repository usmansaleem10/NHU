import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { DbExecutor } from '../client.js';
import { DbError } from '../errors.js';
import { qualifiedName } from '../tenancy/rls.js';

export const DEFAULT_MONTHS_AHEAD = 3;

export interface PartitionOptions {
  /** Months after the current one to pre-create. Default 3. */
  monthsAhead?: number;
  /** Reference date (UTC); defaults to now. Earlier dates backfill past months. */
  from?: Date;
}

/** regclass text: a Drizzle table is quoted safely; a string is taken as Postgres would parse it. */
const regclassText = (parent: PgTable | string): string =>
  typeof parent === 'string' ? parent : qualifiedName(parent);

const utcDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Creates the monthly partitions of `parent` for the current month and `monthsAhead` months
 * after it; existing ones are skipped (idempotent). Runs as the app role through the
 * SECURITY DEFINER function app_ensure_monthly_partitions. Returns how many were created.
 */
export async function ensureMonthlyPartitions(
  db: DbExecutor,
  parent: PgTable | string,
  options: PartitionOptions = {},
): Promise<number> {
  const result = await db.execute<{ created: number }>(sql`
    select app_ensure_monthly_partitions(
      ${regclassText(parent)}::regclass,
      ${options.monthsAhead ?? DEFAULT_MONTHS_AHEAD}::integer,
      ${utcDate(options.from ?? new Date())}::date
    ) as created`);
  return result.rows[0]?.created ?? 0;
}

/** Months (YYYY-MM, UTC) in [from, from + monthsAhead] that have no partition yet. */
export async function missingMonthlyPartitions(
  db: DbExecutor,
  parent: PgTable | string,
  options: PartitionOptions = {},
): Promise<string[]> {
  const result = await db.execute<{ month: string }>(sql`
    with parent as (select ${regclassText(parent)}::regclass as oid),
    months as (
      select to_char(m, 'YYYY-MM') as month, to_char(m, '"_p"YYYYMM') as suffix
        from generate_series(
          date_trunc('month', ${utcDate(options.from ?? new Date())}::date),
          date_trunc('month', ${utcDate(options.from ?? new Date())}::date)
            + make_interval(months => ${options.monthsAhead ?? DEFAULT_MONTHS_AHEAD}::integer),
          interval '1 month') as m
    )
    select months.month
      from months, parent
     where not exists (
       select 1 from pg_inherits i join pg_class c on c.oid = i.inhrelid
        where i.inhparent = parent.oid
          and c.relname = (select relname from pg_class where oid = parent.oid) || months.suffix)
     order by 1`);
  return result.rows.map((row) => row.month);
}

export interface PartitionFailure {
  table: string;
  error: unknown;
}

/** Raised by maintainPartitions so the scheduled job fails (and alerts) instead of passing quietly. */
export class PartitionMaintenanceError extends DbError {
  readonly code = 'PARTITION_MAINTENANCE_FAILED';

  constructor(readonly failures: PartitionFailure[]) {
    super(`Partition maintenance failed for ${failures.map((f) => f.table).join(', ')}`, {
      cause: failures[0]?.error,
    });
  }
}

/**
 * The scheduled job body (e.g. a daily BullMQ repeatable job): ensures partitions for every
 * table, then verifies none of the required months is missing. Tries every table before
 * failing; throws PartitionMaintenanceError listing each failed table.
 */
export async function maintainPartitions(
  db: DbExecutor,
  parents: readonly (PgTable | string)[],
  options: PartitionOptions = {},
): Promise<{ created: number }> {
  let created = 0;
  const failures: PartitionFailure[] = [];
  for (const parent of parents) {
    try {
      created += await ensureMonthlyPartitions(db, parent, options);
      const missing = await missingMonthlyPartitions(db, parent, options);
      if (missing.length > 0) throw new Error(`missing partitions: ${missing.join(', ')}`);
    } catch (error) {
      failures.push({ table: regclassText(parent), error });
    }
  }
  if (failures.length > 0) throw new PartitionMaintenanceError(failures);
  return { created };
}
