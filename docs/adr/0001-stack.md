# ADR 0001: Technology stack and repository shape

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Product owner and engineering lead (roadmap decision D1)
- **Tickets:** DEC (D1), F0-REPO-02 to F0-REPO-11

## Context

We are replacing "Hims Admin" with a white-label, multi-tenant HIMS. All 55 spec features, finance included, ship in one release (D4). The domain model is large (encounters, orders, stock, finance, HR), it is shared between the API and the browser, and the team is small. The main risks are a frontend/backend contract drift, untyped money and time handling, and the bespoke per-hospital forks the legacy system grew.

So the stack has to give us one language end to end, types shared from database to browser, strong runtime validation at the edges, and boring, well-supported infrastructure.

## Decision

**Language and runtime**

- **TypeScript, `strict` everywhere**, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (`packages/config/tsconfig.base.json`). `any`, `@ts-ignore` and non-null `!` are lint errors that cannot be disabled.
- **TypeScript is pinned to `~6.0`, not 7.x.** typescript-eslint, which our strict type-checked lint depends on, supports only TypeScript `<6.1`. A TypeScript bump waits for typescript-eslint support and needs a new ADR.
- **Node 24** (`.nvmrc`, `engines.node >=24`), the current LTS line. We rely on Node 24's `require(esm)` (see "Module format").
- **pnpm 10** pinned through `packageManager`.

**Repository**

- **One monorepo** with pnpm workspaces and **Turborepo**: `apps/api`, `apps/web`, `apps/e2e`, `packages/contracts`, `packages/ui`, `packages/db`, `packages/config`. We can split later; until then everything lives here so one PR can change the contract, the API and the screen together.
- **Feature-based layout** in both apps (`src/features/<feature>/`). A feature is imported by others only through its `index.ts`, and a workspace package only through its package exports. The `hims/import-boundaries` ESLint rule enforces both (F0-REPO-11).
- **Module format:** `packages/*` and `apps/web` are **ESM**. `apps/api` is **CommonJS**, because NestJS's decorator metadata and circular providers are unreliable under ESM. Its tsconfig turns `verbatimModuleSyntax` off, and it loads the ESM workspace packages through Node 24's `require(esm)`. Consequence: shared packages must not use top-level `await`, which `require(esm)` cannot load.

**Application stack**

| Layer | Choice | Why |
|---|---|---|
| API | NestJS on the **Fastify** adapter | Module system that mirrors our domains, DI for testable services, guards and interceptors for permissions and audit; Fastify for throughput |
| Contracts | **Zod** in `packages/contracts` | One schema validates at runtime and types both ends; the typed client is generated from it, so a contract mismatch fails to compile |
| Database | **PostgreSQL 17**, **Drizzle ORM** + drizzle-kit migrations, **PgBouncer** | Typed SQL close to the metal (raw typed `sql` for heavy reports), row-level security for tenancy (ADR 0002), `pg_trgm` for patient search |
| Jobs / cache | Redis + BullMQ | Posting, SMS, PDFs, imports and exports run off the request path |
| Web | React 19, Vite, TanStack Router/Query/Table, Tailwind | Typed routing and server state; virtualized tables for large lists |
| UI kit | `packages/ui` on shadcn/ui primitives, design tokens only | Per-tenant theming through CSS variables, no hard-coded colours |
| PDF / print | Gotenberg (HTML to PDF), ESC/POS for thermal | One template engine for A4, A5, 80 mm and labels |
| Analytics | ClickHouse fed from domain events (Phase 7b) | Years of report data without loading the OLTP database |
| Tests | Vitest (unit, and integration against real Postgres via Testcontainers), Playwright (E2E), v8 coverage | Real-database integration tests; coverage visible on every PR |
| Hosting | Cloud (D2), Docker | Stateless API instances scale out; Kubernetes only when tenant count demands it |

Local development dependencies (Postgres, PgBouncer, Redis, Gotenberg, Mailpit, an SMS stub) run from `compose.yaml` with pinned image versions.

## Consequences

- **Positive:** one language and one type system from table to screen; contract drift becomes a compile error; strict lint plus TDD keeps the large domain model honest; one deployable keeps operations simple.
- **Negative / costs:** TypeScript upgrades are gated on typescript-eslint. The CommonJS API next to ESM packages is a deliberate split that contributors must know about. A monorepo needs Turborepo caching to stay fast.
- **Follow-ups:** F0-REPO-03 (strict TS, ESLint, Prettier, hooks), F0-REPO-04/08 (CI and coverage), F0-REPO-05 (Docker deps), F0-REPO-06 (command contract), F0-REPO-11 (import boundaries).

## Alternatives considered

| Option | Why not |
|---|---|
| Go | Faster raw CPU, but no types shared with the frontend and more boilerplate for a large domain model. Allowed later only for a hot spot that proves CPU-bound |
| .NET 9 | Excellent speed and typing, but two languages to staff |
| ESM for `apps/api` | NestJS decorator metadata and circular providers break under ESM |
| TypeScript 7.x | Not supported by typescript-eslint (`<6.1`), which would cost us type-checked lint |
| Separate services per domain | The team and the release plan don't need it; modules with public service interfaces give the same boundaries in one deployable |
