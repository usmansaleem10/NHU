# HIMS

White-label, multi-tenant Hospital Information & Management System. Every hospital gets its own branded interface from one codebase.

- **Agent and contributor rules:** [AGENTS.md](AGENTS.md)
- **Roadmap:** [docs/plans/2026-10-10-hims-rebuild-roadmap.md](docs/plans/2026-10-10-hims-rebuild-roadmap.md)
- **Tickets:** [hims-tickets.csv](hims-tickets.csv). Run `pnpm status` for the current milestone.
- **Legacy system spec:** [docs/spec/](docs/spec/)

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
| `pnpm build` | Build every workspace (Turborepo, cached) |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm lint` | ESLint (strict, type-checked) |
| `pnpm format` / `pnpm format:check` | Prettier write / check |
| `pnpm status` | Milestone status from the ticket CSV |
