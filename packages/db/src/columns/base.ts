import { sql } from 'drizzle-orm';
import { integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

/**
 * New primary key: UUID v7, generated in the application.
 *
 * Why app-side and not a Postgres default: Postgres 17 has no native uuidv7() (it lands in 18),
 * and an app-side id is known before INSERT, so a service can write the row and its outbox event
 * in the same transaction without a RETURNING round-trip. v7 is time-ordered, so B-tree inserts
 * stay append-only instead of the random page splits v4 causes on big tables.
 */
export const newId = (): string => uuidv7();

/** A non-null UUID v7 column with an app-side default. Use directly on partitioned tables. */
export const uuidV7 = (name: string) => uuid(name).notNull().$defaultFn(newId);

/**
 * Tenant and branch default to the transaction's context (set by withTenant), so repositories
 * never pass tenant_id and it can never come from the client (AGENTS.md rule 1). RLS WITH CHECK
 * rejects any explicit value that differs from the context.
 */
export const tenantIdColumn = () =>
  uuid('tenant_id')
    .notNull()
    .default(sql`app_current_tenant_id()`);

export const branchIdColumn = () =>
  uuid('branch_id')
    .notNull()
    .default(sql`app_current_branch_id()`);

/** created_at / updated_at in UTC (timestamptz). updated_at moves on every Drizzle update. */
export const timestampColumns = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
});

/**
 * created_by / updated_by default to the acting user from the transaction context
 * (withTenant's userId). NULL means a system job wrote the row. No FK yet: the users table
 * arrives with the identity feature.
 */
export const actorColumns = () => ({
  createdBy: uuid('created_by').default(sql`app_current_user_id()`),
  updatedBy: uuid('updated_by')
    .default(sql`app_current_user_id()`)
    .$onUpdateFn(() => sql`app_current_user_id()`),
});

/** Optimistic-locking counter; bump it only through updateWithVersion. */
export const versionColumn = () => integer('version').notNull().default(1);

/** Columns every tenant-scoped table starts with. */
export const tenantColumns = () => ({
  id: uuid('id').primaryKey().$defaultFn(newId),
  tenantId: tenantIdColumn(),
  ...timestampColumns(),
  ...actorColumns(),
  version: versionColumn(),
});

/** Columns every branch-scoped table starts with (tenantColumns + branch_id). */
export const branchColumns = () => ({
  ...tenantColumns(),
  branchId: branchIdColumn(),
});
