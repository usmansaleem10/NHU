# AGENTS.md — HIMS

Instructions for any coding agent (Claude Code, planner/dev/tester/reviewer agents, Codex, etc.) working in this repo. These rules win over agent defaults. If a rule blocks you, stop and ask; don't work around it.

## 0. No goal, no start

**An agent must not start work without a clearly stated goal.**

- The goal comes from a ticket in `hims-tickets.csv` (its `Goal`, `Description` and `Acceptance Criteria` columns) or from the user in plain words.
- Before touching code, restate the goal in one sentence plus the acceptance criteria you will verify. If either is missing or vague, **stop and ask**. Never invent scope.
- Work only toward that goal. Anything else you notice goes into a new ticket row, not into this change.

## What we are building

A **white-label, multi-tenant Hospital Information & Management System**. Each hospital (tenant) gets its own interface: its own domain, branded login screen, theme, enabled modules, forms and print layouts. All of it runs from **one codebase**. All **55 features** in the spec ship as **one release**, finance included.

- **Spec:** `docs/spec/`. Start with `docs/spec/00-overview/feature-index.md`. One doc per feature: `docs/spec/features/<area>/<ID>-<name>.md` (IDs: P platform, C clinical, S supply chain, H HR, F finance, O operations).
- **Roadmap:** `docs/plans/2026-10-10-hims-rebuild-roadmap.md`.
- **Tickets:** `hims-tickets.csv`, the single source of truth for work (decision D5).
- The spec describes the **legacy** app. Its "Issues" section lists defects we must not copy.

## Ticket workflow (`hims-tickets.csv`)

| Column | Who sets it | Rule |
|---|---|---|
| `In Progress` | Agent/dev when starting | `TRUE` only for tickets actively being worked |
| `Done` | Agent/dev | `TRUE` only when the definition of done (bottom) is met, with test output shown |
| `Started On` / `Notes` | Agent/dev | ISO date; notes for decisions or blockers |
| `Signed Off`, `Signed Off By`, `Sign-off Date` | **Department owner only** | Agents never set these |
| `Depends On` | Plan | Don't start a ticket whose dependencies aren't `Done` unless the user says so |

New work found along the way goes in as a new row with the next ID in that epic. Never renumber existing IDs.

## Stack (fixed; changes need an ADR)

| Layer | Choice |
|---|---|
| Runtime | Node 24 (`.nvmrc`); pnpm 10 via `packageManager` |
| Language | TypeScript 6.0.x (`~6.0`), `strict` everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Not 7.x: typescript-eslint supports only `<6.1` |
| Repo | **Monorepo** with pnpm workspaces + **Turborepo**. We can split later; until then, everything lives here |
| API | NestJS on the Fastify adapter |
| Contracts | Zod schemas in `packages/contracts`, shared by API and web; typed client generated from them |
| DB | PostgreSQL 17, Drizzle ORM + drizzle-kit migrations, PgBouncer |
| Jobs/cache | Redis + BullMQ |
| Web | React 19, Vite, TanStack Router/Query/Table, Tailwind |
| UI kit | `packages/ui` (built on shadcn/ui primitives); design tokens only |
| PDF/print | Gotenberg (HTML→PDF), ESC/POS for thermal |
| Analytics | ClickHouse fed from domain events |
| Tests | Vitest (unit + integration with Testcontainers), **Playwright** (E2E), coverage via `@vitest/coverage-v8` |
| Hosting | Cloud (decision D2) |

## Repo layout: feature-based

```
apps/
  web/src/
    app/                       router, providers, shell
    features/<feature>/        one folder per feature (e.g. features/patient-registration)
      routes/  components/  hooks/  api.ts  index.ts
  api/src/
    app/                       bootstrap, middleware, guards
    features/<feature>/        mirrors the web feature name
      <feature>.controller.ts  HTTP only: parse with contract, call service, return
      <feature>.service.ts     business logic lives HERE
      <feature>.repository.ts  Drizzle queries only
      <feature>.schema.ts      Drizzle tables
      <feature>.events.ts      domain events emitted
      *.spec.ts                unit;  *.int.spec.ts  integration (real Postgres)
  e2e/                         Playwright suites, one folder per feature
packages/
  ui/          shared React components + design tokens (see "Shared UI")
  contracts/   Zod schemas + types per feature (the API contract)
  config/      eslint, tsconfig, tailwind presets
docs/spec/     legacy-system knowledge base (read-only)
docs/plans/    roadmap and phase plans
docs/adr/      architecture decision records
```

- **Module format:** `packages/*` and `apps/web` are ESM. `apps/api` is CommonJS (NestJS decorator metadata and circular providers break under ESM), so its tsconfig turns `verbatimModuleSyntax` off. It loads ESM packages through Node 24 `require(esm)`.
- A feature imports another feature **only through its `index.ts` public API**. Never reach into another feature's repository, tables or components.
- Feature folder names use the ticket's epic (e.g. `C01` → `patient-registration`). Record the mapping in the feature's `index.ts` header comment.

## Shared UI (`packages/ui`): the rule of two

- **Anything used in two places becomes a shared component in `packages/ui`.** The second use triggers the extraction. Don't copy-paste a third time.
- `packages/ui` is built **alongside** the app, not after it. Tables, forms, typeahead, patient search, approval timeline, status badges, print preview, filter bar and the record history drawer all live there.
- Components use design tokens (CSS variables) only. No hex/rgb values or raw Tailwind palette colours (e.g. `bg-blue-600`) in features or in `packages/ui`.
- Every shared component has a story or example and a typed props API.

## Screen design

- **Every new screen is designed with the `ui-ux-pro-max` skill before it is built.** Run it for the screen (layout, hierarchy, states: empty, loading, error, permission-denied) and follow its output.
- Screens must work at tablet width (ward and bedside use) and be keyboard-operable for front desk, billing and POS.

## Testing rules

1. **Backend is TDD.** Write the failing test, watch it fail, implement the minimum, watch it pass, refactor.
2. **Every feature ships with Playwright E2E tests** in `apps/e2e/<feature>/` covering its main workflow and key validation errors. A feature isn't done without them.
3. **No useless tests.** A test must be able to fail for a real bug. Don't write:
   - tests that only assert a mock was called with what you passed it
   - snapshot tests of large markup
   - tests of framework or library behaviour
   - getter/setter or "renders without crashing" tests
   - duplicated tests at several layers for the same rule

   Test business rules, edge cases, permissions/scopes, tenancy and money/stock maths.
4. **Tenancy test:** any new table or endpoint needs a test proving tenant A can't read or write tenant B's data.
5. Integration tests run against real Postgres (Testcontainers), never a mocked DB.
6. **Coverage is visible on GitHub.** CI uploads Vitest coverage (lcov) and posts a coverage summary on every PR (Codecov or a coverage-comment action), and a README badge shows it. Coverage must not drop on a PR for `apps/api` service files. We gate on coverage of meaningful code, not on a vanity percentage.

## Non-negotiable architecture rules

1. **Tenancy.** Every table has `tenant_id` (and `branch_id` if branch-scoped). Postgres RLS enforces isolation; the middleware sets `app.tenant_id` / `app.branch_id`. Never bypass RLS. Never take `tenant_id` from the client: it comes from the resolved hostname and session.
2. **Per-hospital interface = configuration, never code.** Branding, login page, theme tokens, enabled modules, forms, templates and numbering come from tenant config. **No `if (tenant === 'x')` anywhere.**
3. **Permissions.** Check `module.resource.action` + scope (`own|department|ward|store|branch|tenant`) with the `@Can()` guard on every endpoint. Navigation is derived from permissions plus enabled modules. Hiding something in the UI is never the only protection.
4. **Audit.** All writes go through services so the audit interceptor records them. No raw SQL writes that bypass it.
5. **Events and finance.** Money and stock changes emit a domain event to the outbox **in the same transaction**. No chart-of-accounts fields on operational tables; posting rules map events to journal entries. Posted financial records are immutable; correct them by reversal.
6. **Approvals.** Anything approvable uses the platform approval engine (P05).
7. **Reference data.** Dropdown values come from the reference-data service. Create a dedicated table only when the entity has behaviour.
8. **Encounters and orders.** OPD/ER/IPD/OT/dialysis are `encounter.type`; lab/radiology/medication/procedure/service are `order.type`. Charges come from orders and are never typed in twice.
9. **Money:** `numeric(14,2)` in the DB and a decimal type in code, never JS `number`. **Time:** `timestamptz` UTC, rendered in the tenant time zone.
10. **Personal data** (CNIC, phone, photo, thumbprint) is encrypted at rest, never logged, and never put in URLs.
11. **Auth:** HttpOnly cookie session. No tokens in query strings or `localStorage`.

## Large data & performance

- Every list endpoint is server-paginated (keyset for big tables) with server-side filter and sort. No unbounded `SELECT`.
- Pickers with possibly more than 50 options use typeahead search endpoints.
- New queries on large tables need a supporting index. Include `EXPLAIN (ANALYZE)` output in the PR for report queries.
- High-volume tables are time-partitioned. Reports and exports run on the read replica; exports over 10k rows run as background jobs.
- No N+1 queries. Web tables over 100 rows are virtualized.

## Coding conventions

- `any`, `@ts-ignore` and non-null `!` are lint errors.
- Validate at the edges with the Zod contract; trust types inside.
- Return typed `DomainError`s; never throw strings.
- Naming: DB `snake_case`, TS `camelCase`, types `PascalCase`, files `kebab-case`. API routes `/api/v1/<resource>` in plural kebab-case.
- User-facing text uses i18n keys, English first and Urdu-ready.
- Keep files focused. Match the surrounding code's style and comment density.

## Agent workflow

1. **Goal:** state the goal and acceptance criteria from the ticket (rule 0). Set `In Progress = TRUE`.
2. **Read** the ticket's `Spec Doc` and `Legacy Screen` before coding.
3. **Explore cheaply.** If `graphify-out/` exists, query it first. Otherwise use targeted Grep/Glob. Pass found files forward; don't re-explore.
4. **Design** new screens with `ui-ux-pro-max`.
5. **Build:** backend TDD; extract shared UI on second use; write the Playwright E2E for the feature.
6. **Bugfixes start small.** Rule out the simple cause (missing import or CSS, unmounted provider, missing setter) before restructuring.
7. **Verify:** run the definition-of-done commands and show the output.
8. **Review:** run `/code-review` on the diff and resolve findings.
9. **Close:** set `Done = TRUE`, add notes, commit with Conventional Commits (`feat(c01): …`) and the ticket ID in the message.

## Commands

```bash
pnpm install
pnpm dev            # api + web + docker deps (postgres, redis, gotenberg)
pnpm typecheck
pnpm lint
pnpm test           # unit, with coverage
pnpm test:int       # integration (Testcontainers)
pnpm test:e2e       # Playwright
pnpm db:generate    # drizzle-kit migration from schema changes
pnpm db:migrate
pnpm db:seed        # two demo hospitals on demo-a.localhost / demo-b.localhost
```

(Phase 0 tickets `F0-REPO-*` create these. Until then they're the contract those tickets must satisfy.)

## Definition of done

- [ ] Goal and acceptance criteria from the ticket are met and demonstrated
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:int && pnpm test:e2e` pass, with output shown
- [ ] Backend changes written test-first; tests are meaningful (no useless tests)
- [ ] Playwright E2E covers the feature's workflow
- [ ] New screens designed with `ui-ux-pro-max`; repeated UI extracted to `packages/ui`
- [ ] Tenancy isolation test for new data; permissions guarded; writes audited; events emitted where money or stock moves
- [ ] No hard-coded tenant logic, colours or user-facing strings
- [ ] Large-data rules respected
- [ ] Coverage report posted on the PR and not lower for touched service files
- [ ] `/code-review` run and findings resolved
- [ ] Ticket row updated (`Done = TRUE`, notes). Sign-off is left to the department owner.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
