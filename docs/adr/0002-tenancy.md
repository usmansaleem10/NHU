# ADR 0002: Row-level multi-tenancy, resolved from the hostname

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Product owner and engineering lead (roadmap decisions D1, D7)
- **Tickets:** F0-REPO-05, F0-DB-*, F0-TEN-*

## Context

Every hospital (tenant) gets its own interface: its own domain, login page, theme, enabled modules, forms and print layouts, all from one codebase and one deployment (D7). Hospitals must never see each other's data or branding, and most hospitals have several branches. Onboarding a hospital must be configuration only, never code.

Application-level `WHERE tenant_id = ?` filters alone fail open: one forgotten filter in one query leaks another hospital's patients. We want the database to refuse cross-tenant access even when application code is wrong.

## Decision

**Where the tenant comes from**

- The tenant is resolved from the request's **hostname** (a subdomain such as `ncih.<product>.pk`, or a custom domain mapped in tenant config), then confirmed against the session. **Never from the client:** no tenant ID in request bodies, query strings or headers that the client chooses.
- The branch comes from the session (the user's selected branch, checked against their scopes).
- Per-hospital differences are tenant **configuration** (branding, theme tokens, enabled modules, forms, templates, numbering). `if (tenant === 'x')` is forbidden.

**How the database enforces it**

- **Every table has `tenant_id`**, and branch-scoped tables also have `branch_id`.
- **Postgres row-level security (RLS) on every tenant table, with `FORCE ROW LEVEL SECURITY`**, so the policy applies even to the table owner. Policies compare the row with the transaction's settings, e.g. `tenant_id = current_setting('app.tenant_id')::uuid`.
- **Two roles** (`docker/postgres/init/01-roles.sql`):
  - `hims`: owner and migrator, connects directly on `:5432`. Migrations and admin only.
  - `hims_app`: what the API uses. `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`, so RLS always applies to it. It gets DML on the migrator's tables through default privileges.
- **The API connects through PgBouncer in transaction pooling mode.** A server connection is shared between clients between transactions, so session state would leak from one request (tenant) to the next.
- Therefore **tenant context is set per transaction, never per session:** the request middleware opens a transaction and runs `SELECT set_config('app.tenant_id', $1, true), set_config('app.branch_id', $2, true)`. The third argument `true` makes the setting transaction-local (like `SET LOCAL`); it disappears at commit or rollback. PgBouncer's `server_reset_query` does not run in transaction mode, so nothing else would clean it up.
- A query with no tenant context matches no rows (the policy compares with an unset or empty setting). Failing closed is intended.
- **Never bypass RLS** in application code. Cross-tenant work (platform admin, migrations) uses the `hims` role through dedicated, audited paths.

**How we prove it**

- Any new table or endpoint ships with a **tenancy test** showing tenant A can't read or write tenant B's data (AGENTS.md testing rule 4). Integration tests run against real Postgres 17 via Testcontainers, never a mocked database, connected as the app role so RLS is in force.

## Consequences

- **Positive:** isolation holds even when a query forgets a filter; one deployment serves every hospital; onboarding is configuration.
- **Negative / costs:** every query must run inside a transaction that set the context, so background jobs must set it too. Session-level features (`SET`, session advisory locks, `LISTEN`) are unavailable through PgBouncer in transaction mode. RLS predicates need supporting indexes that start with `tenant_id`. Migrations must enable and force RLS on every new table, which review and tests must check.
- **Follow-ups:** F0-DB (base columns, RLS helpers, tenancy test harness), F0-TEN (hostname resolution, tenant config), F0-AUTH (session carries tenant and branch).

## Alternatives considered

| Option | Why not |
|---|---|
| Database per tenant | Strong isolation, but migrations, pooling and cross-tenant platform features multiply with each hospital |
| Schema per tenant | Same migration and connection fan-out problems; `search_path` is session state that PgBouncer transaction pooling would leak |
| Application-level filtering only | Fails open on a single forgotten `WHERE` |
| `SET` (session) for tenant context | Leaks across clients under PgBouncer transaction pooling |
| Tenant ID from a request header or body | The client could choose another hospital |
| Superuser or `BYPASSRLS` app role | Policies would silently not apply |
