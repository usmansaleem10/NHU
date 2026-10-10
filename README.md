# HIMS

[![CI](https://github.com/usmansaleem10/NHU/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/usmansaleem10/NHU/actions/workflows/ci.yml?query=branch%3Amain)
[![coverage](https://github.com/usmansaleem10/NHU/raw/coverage-badge/coverage.svg)](https://github.com/usmansaleem10/NHU/actions/workflows/ci.yml?query=branch%3Amain)

White-label, multi-tenant Hospital Information & Management System. Every hospital gets its own branded interface from one codebase.

- **Agent and contributor rules:** [AGENTS.md](AGENTS.md)
- **Roadmap:** [docs/plans/2026-10-10-hims-rebuild-roadmap.md](docs/plans/2026-10-10-hims-rebuild-roadmap.md)
- **Tickets:** [hims-tickets.csv](hims-tickets.csv). Run `pnpm status` for the current milestone.
- **Legacy system spec:** [docs/spec/](docs/spec/)
- **Architecture decisions:** [docs/adr/](docs/adr/) (stack, tenancy, events and finance; new ones from `0000-template.md`)

## Prerequisites

- Node 24 (`nvm use` reads `.nvmrc`)
- pnpm 10 (`corepack enable` picks the version from `package.json`)
- A Docker-compatible runtime with Compose v2 (Docker Desktop, OrbStack or Colima)

## Quick start

```bash
nvm use
pnpm install
pnpm deps:up        # start Postgres, PgBouncer, Redis, Gotenberg, Mailpit, SMS stub
pnpm build
pnpm status
```

## Local dependencies

| Service | Purpose | Host port | Connect with |
|---|---|---|---|
| Postgres 17 | Primary database | 5432 | `postgres://hims:hims@localhost:5432/hims` as owner: **migrations and admin only** (superuser, bypasses RLS) |
| PgBouncer | Connection pooling (transaction mode), **used by the API** | 6432 | `postgres://hims_app:hims_app@localhost:6432/hims` (app role, no superuser, RLS enforced) |
| Redis 8 | Sessions, cache, BullMQ jobs | 6379 | `redis://localhost:6379` |
| Gotenberg 8 | HTML → PDF printing | 3100 | `http://localhost:3100` (3000 is kept free for the API) |
| Mailpit | Catches outgoing email | 1025 (SMTP), 8025 (UI) | UI at http://localhost:8025 |
| SMS stub | Logs outgoing SMS gateway calls | 8090 | `http://localhost:8090`; see calls with `pnpm deps:logs sms-stub` |

Credentials are for local development only, and every port binds to `127.0.0.1`, so nothing is reachable from your network. Ports clash with something already running? Copy `.env.example` to `.env` and change them.

The `hims_app` role is created by `docker/postgres/init/01-roles.sql` the first time the Postgres volume is created. If you change that file, run `pnpm deps:reset` to recreate it.

| Command | What it does |
|---|---|
| `pnpm deps:up` | Start everything and wait until all services are healthy |
| `pnpm deps:down` | Stop everything (data kept) |
| `pnpm deps:reset` | Stop everything and **delete** the Postgres and Redis data volumes |
| `pnpm deps:logs [service]` | Follow logs |

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev` | `pnpm deps:up`, then every workspace's `dev` (API + web dev servers) |
| `pnpm build` | Build every workspace (Turborepo, cached) |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm lint` | ESLint (strict, type-checked) |
| `pnpm test` | Unit tests (`*.spec.ts`) with coverage, per workspace (cached) |
| `pnpm test:int` | Integration tests (`*.int.spec.ts`) against real Postgres via Testcontainers (needs Docker) |
| `pnpm test:e2e` | Playwright end-to-end suites (`apps/e2e`) |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply migrations (run `pnpm deps:up` first) |
| `pnpm db:seed` | Migrate, then seed the two demo hospitals |
| `pnpm format` / `pnpm format:check` | Prettier write / check |
| `pnpm status` | Milestone status from the ticket CSV |

Every command runs through Turborepo, so a workspace without that script is skipped. Turbo runs tasks in strict env mode: a task sees only the variables `turbo.json` lets through. `dev`, `test:int`, `test:e2e` and `db:*` are never cached and declare `passThroughEnv` (e.g. `DATABASE_*`, `REDIS_*`, `DOCKER_*`, `TESTCONTAINERS_*`, `PLAYWRIGHT_*`). If a task needs a new variable, add it there.

### Tests in a workspace

Vitest config is shared through `@hims/config/vitest`. A workspace with tests adds `vitest` and `@vitest/coverage-v8` as devDependencies and needs only:

```ts
// vitest.config.ts
export { default } from '@hims/config/vitest';
```

```jsonc
// package.json scripts
"test": "vitest run --project unit --coverage",
"test:int": "vitest run --project integration"
```

Need plugins or jsdom? `import { vitestConfig } from '@hims/config/vitest'` and `export default vitestConfig({ ... })`.

### Coverage on GitHub

- Every PR gets a coverage comment: totals, plus the files it touched, with the change against the PR's base commit. Each CI run also shows the totals in its job summary. The full reports, including each workspace's `lcov.info`, are the `coverage` artifact of the run.
- **The gate:** "Quality gate" fails on a PR when a touched `apps/api/src/**/*.service.ts` file (renames are followed to their old path):
  - has lower line, statement, function or branch coverage than on the base commit;
  - is new (no baseline) and is below 80% on any of those;
  - has statements but none of them run under the unit tests, whatever the base said;
  - sits in a workspace that produced no coverage report (usually: no `test` script).

  The base commit is only re-tested when the PR touches such a file. The logic lives in `packages/config/src/ci/` (`pnpm exec hims-coverage merge|touches|gate|badge`).
- The coverage badge at the top is repo-wide line coverage on `main`. CI writes `coverage.svg` (and a shields.io-style `coverage.json`) to the `coverage-badge` branch. The repo is private, so the badge only renders for signed-in collaborators; no token or third-party service is involved. It reads "unknown" until the first push to `main` produces coverage.

