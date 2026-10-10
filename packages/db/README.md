# @hims/db

Database infrastructure shared by the API and future workers: Drizzle client, the migration
pipeline and base columns. Feature tables live in `apps/api/src/features/<feature>/<feature>.schema.ts`.

## Roles and connections

| Use                       | Role       | Connection                    | Env var (suggested)      |
| ------------------------- | ---------- | ----------------------------- | ------------------------ |
| API / workers at runtime  | `hims_app` | PgBouncer `:6432` (txn pool)  | `DATABASE_URL`           |
| Migrations, admin         | `hims`     | Postgres direct `:5432`       | `DATABASE_MIGRATION_URL` |

```ts
import { createDatabase } from '@hims/db';

const { db, close } = createDatabase({ connectionString: process.env.DATABASE_URL! }, schema);
```

## Migrations

One ordered folder, `packages/db/migrations`, for the whole database. `drizzle.config.ts` reads
infrastructure tables from `src/schema/*.ts` and feature tables from
`apps/api/src/features/*/*.schema.ts`.

```bash
pnpm --filter @hims/db db:generate                     # diff schema -> new SQL migration (no DB needed)
pnpm --filter @hims/db db:generate --custom --name=x   # empty SQL file for hand-written DDL
DATABASE_MIGRATION_URL=postgres://hims:hims@localhost:5432/hims pnpm --filter @hims/db db:migrate
```

`db:migrate` (or `runMigrations()` from code):

- refuses to run as `hims_app` (`MigrationRoleError`);
- takes a session advisory lock, so replicas deploying at once apply migrations exactly once
  (this is why it must not go through PgBouncer);
- applies all pending migrations in one transaction.

There is no `db:seed` here yet: demo tenants need the tenants table (tenancy track).

## Base columns

```ts
import { pgTable, text } from 'drizzle-orm/pg-core';
import { branchColumns, tenantColumns } from '@hims/db';

export const wards = pgTable('wards', { ...branchColumns(), name: text('name').notNull() });
```

| Column                      | Behaviour                                                                 |
| --------------------------- | ------------------------------------------------------------------------- |
| `id`                        | UUID v7, generated in the app (`newId()`): time-ordered, known pre-insert |
| `tenant_id` / `branch_id`   | default to the transaction's tenant/branch context; never pass them       |
| `created_at` / `updated_at` | `timestamptz`; `updated_at` set to `now()` on every Drizzle update        |
| `created_by` / `updated_by` | default to the acting user from context; `NULL` = system job              |
| `version`                   | optimistic-locking counter, starts at 1                                   |

Why UUID v7 in the app: Postgres 17 has no `uuidv7()` (it arrives in 18), and an id known before
insert lets a service write the row and its outbox event in one transaction. v7 is time-ordered,
so primary-key inserts stay append-only.

### Optimistic locking

```ts
import { updateWithVersion, StaleVersionError } from '@hims/db';

const ward = await updateWithVersion(tx, wards, { id, expectedVersion: dto.version }, { name });
// StaleVersionError (code STALE_VERSION) -> 409; RecordNotFoundError (RECORD_NOT_FOUND) -> 404
```

## Tenancy: row-level security

Every table with a `tenant_id` is isolated by Postgres RLS. The app role `hims_app` is
`NOBYPASSRLS` and does not own tables, so it cannot switch RLS off (`row_security = off` errors,
`ALTER TABLE ... DISABLE ROW LEVEL SECURITY` needs the owner).

### Querying: `withTenant`

```ts
import { withTenant } from '@hims/db';

const beds = await withTenant(db, { tenantId, branchId, userId }, (tx) =>
  tx.select().from(wardBeds),
);
```

- Opens a transaction and sets `app.tenant_id`, `app.branch_id`, `app.user_id` with
  `set_config(..., true)` (transaction-local). This is required, not a style choice: PgBouncer in
  transaction pooling hands the server connection to another client after `COMMIT` and never runs
  `server_reset_query`, so a session-level `SET` would leak one tenant's context to the next.
- `tenantId` comes from the resolved hostname + session, never from the request (AGENTS.md rule 1).
- `branchId` omitted = tenant-wide (all branches); set = confined to that branch on branch-scoped tables.
- No context = no rows, and every write fails the policy.
- Malformed ids throw `InvalidTenantContextError` before any query runs.

### Creating a tenant table

1. Define it with `tenantColumns()` or `branchColumns()` and run `db:generate`.
2. Append the RLS DDL to that migration (drizzle-kit does not emit `FORCE`):

   ```bash
   pnpm --filter @hims/db db:rls wards --branch
   ```

   It prints `ENABLE` + `FORCE ROW LEVEL SECURITY` and a `tenant_isolation` policy whose `USING`
   and `WITH CHECK` are `tenant_id = (select app_current_tenant_id())` (plus the branch condition).
   The same SQL is available from code as `tenantRlsSql(table, { branchScoped })`.

### Guard (CI + deploy)

`assertTenantTablesHaveRls(db)` fails if any table or partition with a `tenant_id` column lacks
RLS enabled, forced, or (for non-partitions) a policy. It runs:

- at the end of every `runMigrations()` / `db:migrate`, so a bad migration fails the deploy;
- in `src/tenancy/rls.int.spec.ts` against all real migrations, so CI fails first.

## Tests

```bash
pnpm --filter @hims/db test       # unit
pnpm --filter @hims/db test:int   # integration: Testcontainers postgres:17.11, needs Docker
```

Integration tests run against a real Postgres with the same roles as the dev stack
(`docker/postgres/init/01-roles.sql`). With OrbStack, Testcontainers finds the socket through
`/var/run/docker.sock`; otherwise set `DOCKER_HOST=unix://$HOME/.orbstack/run/docker.sock`.
