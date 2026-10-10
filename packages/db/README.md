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

## Time partitioning (high-volume tables)

`audit_log`, `domain_events`, `stock_ledger`, `vitals`, `invoices` (and any other append-heavy
table) are range-partitioned by month on a `timestamptz` column, with UTC month bounds.

### Creating one

drizzle-kit cannot emit `PARTITION BY`, so:

1. Define the table in Drizzle for typing. The partition key must be in the primary key:
   ```ts
   export const vitals = pgTable(
     'vitals',
     { id: uuidV7('id'), tenantId: tenantIdColumn(), recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(), ... },
     (t) => [primaryKey({ columns: [t.id, t.recordedAt] })],
   );
   ```
2. Run `db:generate`, then edit the generated `CREATE TABLE` to end with
   `) PARTITION BY RANGE ("recorded_at");` (drizzle-kit's snapshot ignores partitioning, so later
   diffs are unaffected). Append `db:rls vitals` output as for any tenant table.
3. In the same migration, create the first partitions:
   `SELECT app_ensure_monthly_partitions('vitals', 3);`

No `DEFAULT` partition: a row for a month without a partition fails loudly (SQLSTATE 23514)
instead of piling into a default partition that later blocks creating that month.

### Scheduled job

```ts
import { maintainPartitions } from '@hims/db';

// daily BullMQ repeatable job, app-role database (not a transaction):
await maintainPartitions(db, ['audit_log', 'domain_events', 'stock_ledger', 'vitals', 'invoices']);
```

- Calls `app_ensure_monthly_partitions(table, 3)`: creates the current month + 3 ahead, skips
  existing ones (idempotent, safe to run concurrently). It is `SECURITY DEFINER`, so the job runs as
  `hims_app` and needs no owner credentials; it only accepts tables range-partitioned on one
  `timestamptz`/`date` column.
- Then re-checks coverage (`missingMonthlyPartitions`). Any failure throws
  `PartitionMaintenanceError` listing every failed table, after trying all of them. Wire the job's
  failed event to alerting (jobs track); with 3 months of headroom there is time to react.
- New partitions get RLS enabled + forced with no policy. Through the parent, the parent's tenant
  policy applies; a partition queried directly by name returns nothing.
- Retention (detaching/dropping old partitions) is not built yet: it needs a per-table retention
  policy decision.

## PII encryption at rest + blind indexes

CNIC, phone numbers, photos and thumbprint templates are stored encrypted (AGENTS.md rule 10).

- **Envelope encryption.** Each tenant has its own random 256-bit data key(s) and one HMAC index
  key in `tenant_keys`, stored only wrapped by a master key. The master key comes from a
  `MasterKeyProvider`: `LocalMasterKeyProvider.fromEnv()` for dev/tests
  (`HIMS_MASTER_KEYS="k1:<base64 32 bytes>"`, `HIMS_MASTER_KEY_ID=k1`); production implements the
  same two-method interface over a cloud KMS so the master key never leaves it.
- **AES-256-GCM** (node:crypto), random 96-bit IV, authenticated with AAD = tenant + field, so a
  ciphertext copied to another tenant or column fails to decrypt (`DecryptionError`). Each
  ciphertext carries its data-key version.
- **Blind index**: HMAC-SHA256 of the normalised value with the tenant's index key. Exact search
  only. Per-tenant keys mean the same CNIC has different indexes in different hospitals.
- **Normalisation** before indexing: CNIC to 13 digits (`normaliseCnic`), phone to E.164 Pakistan
  (`normalisePkPhone`: `0300-1234567`, `3001234567`, `+92 300 1234567`, `0092...`, landlines).
  Errors (`InvalidPiiError`) never include the value.

Explicit helpers, not a magic column type: encryption is async (key lookup/unwrap), and Drizzle
column mappers are synchronous.

```ts
const patients = pgTable('patients', {
  ...tenantColumns(),
  cnicEnc: bytea('cnic_enc'),
  cnicBidx: bytea('cnic_bidx'), // index (tenant_id, cnic_bidx)
  phoneEnc: bytea('phone_enc'),
  phoneBidx: bytea('phone_bidx'),
});

const keyring = new PiiKeyring(LocalMasterKeyProvider.fromEnv()); // one per process

await withTenant(db, ctx, async (tx) => {
  const pii = await keyring.forTenant(tx); // creates the tenant's keys on first use
  const cnic = await pii.protectCnic(dto.cnic); // { encrypted, index }
  await tx.insert(patients).values({ cnicEnc: cnic.encrypted, cnicBidx: cnic.index, ... });

  const found = await tx.select().from(patients)
    .where(eq(patients.cnicBidx, await pii.cnicIndex(query))); // exact match, any spelling
  const plain = await pii.decrypt('cnic', found[0].cnicEnc);  // '3520212345671'
});
```

Photos/thumbprints: `pii.encryptBytes('photo', buffer)` (or encrypt before writing to object
storage). Never log decrypted values or put them in URLs.

### Key rotation

- **Data key** (implemented): `keyring.rotateDataKey(tx)` adds version n+1. New writes use it;
  old ciphertexts keep decrypting because each names its key version. A background job can then
  re-encrypt rows still on old versions (decrypt + encrypt) and, once none remain, delete the old
  key row. Do this on suspected compromise or on a schedule (e.g. yearly).
- **Master key** (documented, not built): add the new master key to the provider and make it
  active. Existing tenant keys still unwrap with the old one (`master_key_id` per row). Re-wrap
  every `tenant_keys` row (unwrap with old, wrap with new; cheap, no PII rows touched) as the
  owner role, since it spans tenants, then retire the old master key.
- **Index key**: rotating it means recomputing every blind index from decrypted values (a
  re-index job), so it is only rotated on compromise.

## Money and quantities

`numeric(14,2)` money and `numeric(14,3)` quantities map to `Decimal` (decimal.js), never JS
`number` (AGENTS.md rule 9).

```ts
import { money, quantity, roundMoney, toDecimal, decimalFromDb } from '@hims/db';

export const invoiceLines = pgTable('invoice_lines', {
  ...tenantColumns(),
  qty: quantity('qty').notNull(),
  unitPrice: money('unit_price').notNull(),
  amount: money('amount').notNull(),
});

const amount = roundMoney(toDecimal(dto.qty).times(dto.unitPrice)); // explicit rounding
const [{ total }] = await tx
  .select({ total: sql<string>`sum(${invoiceLines.amount})`.mapWith(decimalFromDb) })
  .from(invoiceLines);
```

- Inputs are strings or `Decimal` only (`DecimalInput`); contracts should carry money as decimal
  strings.
- Writing a value with more decimal places than the column throws `DecimalValueError` instead of
  letting Postgres round silently; round explicitly with `roundMoney` / `roundQuantity` (half away
  from zero, same as Postgres). Overflow of `numeric(14,s)` is rejected too.
- Why decimal.js over big.js: per-operation rounding modes (half-up, banker's) and richer maths
  for tax/discount/pro-rata; we use a private `Decimal.clone` so global config can't leak.
- Raw SQL / aggregates return numeric as strings: `.mapWith(decimalFromDb)`.

## Tenant-isolation test helper (`@hims/db/testing`)

AGENTS.md testing rule 4: every new table or endpoint needs a test proving tenant A cannot read or
write tenant B's data. Use these instead of hand-rolling it. Add `@testcontainers/postgresql` and
`drizzle-kit` as devDependencies of the consuming package.

```ts
import {
  assertTableTenantIsolation,
  assertTenantIsolation,
  createTables,
  startTestDatabase,
} from '@hims/db/testing';
import { createDatabase, tenantRlsSql } from '@hims/db';

const pgc = await startTestDatabase(); // postgres:17.11 + hims/hims_app roles + all migrations
// Feature tables already in migrations need nothing more; ad-hoc fixtures:
await createTables(pgc.ownerUrl, { wards }, tenantRlsSql(wards, { branchScoped: true }));
const app = createDatabase({ connectionString: pgc.appUrl }); // ALWAYS the app role

// Table level: cross-tenant read/update/delete, insert-for-other-tenant, move-to-other-tenant,
// and no access without context.
await assertTableTenantIsolation({
  db: app.db,
  table: wards,
  values: () => ({ name: 'Ward 1' }),
  change: { name: 'hijacked' },
});

// Repository / service level: pass your own operations. Thrown errors count as "denied";
// the helper checks the record's actual state as its owner afterwards.
await assertTenantIsolation({
  db: app.db,
  create: async (tx) => (await wardsRepository.create(tx, { name: 'W' })).id,
  read: (tx, id) => wardsRepository.findById(tx, id),
  update: (tx, id) => wardsRepository.rename(tx, id, 1, 'hijacked'),
  remove: (tx, id) => wardsRepository.remove(tx, id),
});
```

Failures throw `node:assert` `AssertionError`, so it works under any test runner. Every
operation also receives the acting `TenantContext`, so endpoint tests (API track) can ignore `tx`
and call HTTP routes with that tenant's session instead. `pgErrorOf(promise)` unwraps Drizzle's error to the Postgres
SQLSTATE (`RLS_VIOLATION = '42501'`).

## Tests

```bash
pnpm --filter @hims/db test       # unit
pnpm --filter @hims/db test:int   # integration: Testcontainers postgres:17.11, needs Docker
```

Integration tests run against a real Postgres with the same roles as the dev stack
(`docker/postgres/init/01-roles.sql`). With OrbStack, Testcontainers finds the socket through
`/var/run/docker.sock`; otherwise set `DOCKER_HOST=unix://$HOME/.orbstack/run/docker.sock`.
