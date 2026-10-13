# ADR 0004: Database roles: bootstrap superuser, non-superuser owner, app role

- **Status:** Accepted (2026-10-13)
- **Supersedes:** the two-role model described in ADR 0002 (owner = superuser `hims`)

## Context

ADR 0002 had two roles: `hims` (superuser, owner and migrator) and `hims_app` (API, `NOSUPERUSER NOBYPASSRLS`). Review of F0-DB-04 showed that a superuser owner turns any bug in a `SECURITY DEFINER` function into full database takeover: `hims_app` escalated itself to `SUPERUSER` through `app_ensure_monthly_partitions` (an expression partition key fell through a NULL check). A superuser also ignores `FORCE ROW LEVEL SECURITY`, so the owner was never really bound by tenancy policies.

## Decision

Three roles, created by `docker/postgres/init/01-roles.sql` locally and by the same statements in every environment:

| Role | Attributes | Used for |
|---|---|---|
| `hims` | superuser | Bootstrap only: creating roles and the database. Never used by the app or migrations. |
| `hims_owner` | `LOGIN NOSUPERUSER NOBYPASSRLS` | Owns schema `public` and every object; runs migrations over a **direct** connection (never PgBouncer). |
| `hims_app` | `LOGIN NOSUPERUSER NOBYPASSRLS` | The API and workers, through PgBouncer (transaction pooling). DML only, via default privileges from `hims_owner`. |

- `runMigrations` refuses superusers, `BYPASSRLS` roles and `hims_app`.
- `SECURITY DEFINER` functions are owned by `hims_owner`, pin `search_path = pg_catalog, pg_temp`, schema-qualify everything and validate inputs NULL-safely.
- Because the owner is bound by `FORCE ROW LEVEL SECURITY`, data migrations on tenant tables must set a tenant context or temporarily `NO FORCE` inside the migration transaction (see `packages/db/README.md`).

## Consequences

- A definer-function bug can reach at most `hims_owner`'s privileges, not the cluster.
- Every environment (dev, CI Testcontainers, production) must create `hims_owner` and `hims_app` exactly as `01-roles.sql` does.
- Dev volumes created before this ADR must be recreated (`pnpm deps:reset`).
