import { and, eq, getTableName, sql } from 'drizzle-orm';
import type { PgColumn, PgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';

import type { DbExecutor } from './client.js';
import { RecordNotFoundError, StaleVersionError } from './errors.js';

export type VersionedTable = PgTable & { id: PgColumn; version: PgColumn };

/* eslint-disable @typescript-eslint/no-generated-empty-object-type -- the Drizzle row/set types
   resolve to {} only inside this generic body; at every call site they are the concrete table's. */
/**
 * UPDATE ... WHERE id = $id AND version = $expectedVersion, bumping version by one.
 * Throws StaleVersionError when someone else updated the row first, RecordNotFoundError when
 * the row does not exist (or RLS hides it). Returns the updated row.
 */
export async function updateWithVersion<T extends VersionedTable>(
  db: DbExecutor,
  table: T,
  target: { id: string; expectedVersion: number },
  values: Omit<PgUpdateSetSource<T>, 'id' | 'version'>,
): Promise<T['$inferSelect']> {
  const set = { ...values, version: sql`${table.version} + 1` } as PgUpdateSetSource<T>;
  const updated = (await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, target.id), eq(table.version, target.expectedVersion)))
    .returning()) as T['$inferSelect'][];

  const row = updated[0];
  if (row !== undefined) return row;

  const source: PgTable = table; // widened: Drizzle's generic select-from check can't see T's columns
  const current = await db
    .select({ version: table.version })
    .from(source)
    .where(eq(table.id, target.id));
  const actual = current[0]?.version;
  if (typeof actual !== 'number') throw new RecordNotFoundError(getTableName(table), target.id);
  throw new StaleVersionError(getTableName(table), target.id, target.expectedVersion, actual);
}
/* eslint-enable @typescript-eslint/no-generated-empty-object-type -- end of generic body */
