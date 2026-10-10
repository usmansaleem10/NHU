# HIMS Rebuild — Master Roadmap

> **For agentic workers:** This is the **master roadmap**, not a task-level plan. Each phase below gets its own implementation plan (`docs/superpowers/plans/YYYY-MM-DD-phase-N-<name>.md`) written with superpowers:writing-plans, executed with superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a white-label, multi-tenant HIMS where every hospital gets its own branded interface (own domain, login screen, logo, colours, enabled modules, forms and print layouts) from one shared codebase, and ship **all 55 spec features as one release**, finance included, to replace "Hims Admin" at the Camden Health System / Novocare two-branch hospital.

**Definition of "goal reached" (go-live gate):** every ticket in `hims-tickets.csv` (except deferred Phase 10 migration) is `Done` and `Signed Off`, and:
1. A patient can be registered, invoiced and paid at the front desk, seen in outpatient (OPD) or emergency (ER), admitted, treated, sent for lab and radiology tests, given medicine from the pharmacy, discharged and finally settled, all in the new system and at both branches.
2. Every billable and stock event creates an accounting posting event. These are stored even if the finance screens (V1) aren't live yet, so no history is lost.
3. Finance (COA, posting rules, GL, payables, statements), HR/payroll, OT, blood bank, dialysis, claims, doctor share, donations, reports, dashboards and the service desk/task modules are live in the same release.
4. Each hospital opens on its own domain (e.g. `ncih.<product>.pk` or a custom domain) and sees its own login screen, theme, logo, menus (enabled modules only) and letterheads. Hospitals never see each other's data or branding. Onboarding a second hospital means configuration only, with no code change.
5. Users hold permissions by role and scope. Every change to a record shows who changed it and when.
6. Two weeks of parallel run with zero unresolved P1 defects, and sign-off from front desk, nursing, lab, radiology, pharmacy, stores and finance leads.

**Architecture:** The tenant (hospital) is resolved from the request's hostname, so each hospital has its own URL and branding while running on the same deployment. One deployable application split into modules by domain (Platform, Patient Admin, Clinical, Diagnostics, Supply Chain, Revenue Cycle, HR, Finance), each owning its own tables and exposing a public service interface. It is not split into separate services. Every row carries `tenant_id` and `branch_id`, enforced by Postgres row-level security. Domain events go through an "outbox" table (written in the same transaction as the change). Posting rules consume those events and turn them into journal entries. One shared encounter model and one shared order model underpin OPD, ER, IPD and OT.

**Tech Stack (decided, D1):** TypeScript `strict` end to end, with types shared from the database to the browser.
- **API:** Node 22 + **NestJS on the Fastify adapter**. Modules mirror the domains. **Zod** contracts in `packages/contracts` validate at runtime and generate the typed frontend client (ts-rest/OpenAPI), so a frontend/backend mismatch fails to compile.
- **Database:** **PostgreSQL 17** with **Drizzle ORM** (typed schema and queries, raw typed `sql` for heavy reports). RLS for tenant isolation. **PgBouncer** for connection pooling. `pg_trgm` for fuzzy patient search. Time-partitioned high-volume tables (`audit_log`, `domain_events`, `stock_ledger`, vitals, invoices). A read replica serves reports.
- **Analytics (Phase 7b):** **ClickHouse**, fed from the outbox events, for reports and dashboards over years of data. Until then, Postgres replica plus materialized views.
- **Jobs and cache:** Redis + BullMQ (posting, SMS, PDFs, imports, exports).
- **Web:** React 19 + **Vite** + TanStack Router/Query/Table (virtualized grids for large lists, server-side paging and filtering) + Tailwind + shadcn/ui. Tenant theme as CSS variables loaded at runtime.
- **Docs and printing:** Gotenberg (HTML→PDF), ESC/POS for thermal.
- **Quality:** Vitest, **Testcontainers** (real Postgres in tests), Playwright end-to-end, ESLint strict-type-checked, CI gate on typecheck.
- **Infra:** Docker; managed Postgres; start on a few containers, move to Kubernetes when there are many tenants. API instances are stateless, so they scale out horizontally.
- *Alternatives considered:* Go (faster raw CPU, but no shared types with the frontend and more boilerplate for a large domain model); .NET 9 (excellent speed and typing, but two languages to staff). Use either one only for a hot spot that proves CPU-bound.

**Tickets:** `hims-tickets.csv` is the tracker (D5): one row per ticket with goal, description, acceptance criteria, legacy screen, estimate, In Progress/Done and department sign-off columns.

**Spec:** `hims-brain.zip` → `docs/spec/` (feature docs `features/<area>/<ID>-*.md`, overview in `00-overview/`).

## Global Constraints

Every phase plan inherits these. Sources: `00-overview/pain-points-and-rebuild-principles.md`, `roles-and-permissions.md`, `cross-cutting-concepts.md`.

- **Per-hospital interface (white-label):** each tenant has a hostname (subdomain plus optional custom domain with automatic TLS), branded login page (logo, background image, organization name for the login page, welcome text, colours), a theme expressed as design tokens (CSS variables, never hard-coded colours), favicon, email and SMS sender names, enabled modules (feature flags drive navigation), default language, and form, print and numbering configuration. All of this is tenant **configuration**, not forked code. Per-tenant code forks are forbidden.
- Multi-tenant and multi-branch from day one. No table without `tenant_id`; branch-scoped tables carry `branch_id`.
- Permissions are `module.resource.action` plus a scope (`own | department | ward | store | branch | tenant`). Users can hold several roles, and navigation is built from permissions. No menus configured per role.
- One approval engine (P05) for every approvable document: IR, PR, PO, leave, loan, discount, refund, price change, doctor share.
- One template and print engine (P06) using HTML→PDF, with A4, A5, 80mm thermal and label outputs.
- No chart-of-accounts fields on operational setup records. Finance is driven only by events plus posting rules (F04).
- One typed reference-data service replaces the generic configurator and lookup tables. Dedicated tables only for entities with behaviour (Department, Ward, Bed, Store, Service, Product).
- Audit log on every write: actor, timestamp, before and after values, source. It's visible on each record.
- Posted financial documents can't be changed. Corrections are made by reversal only.
- Auth tokens go in HttpOnly cookies or the Authorization header, never in query strings. No user object in `localStorage`.
- One API generation, versioned at `/api/v1`.
- Search-first UX: typeahead for every list with more than 50 options. Shared patient search covering MRN, name, phone, CNIC and admission ID.
- Pakistan specifics: CNIC validation (13 digits, 5-7-1), PKR formatting, FBR POS invoice number and QR on receipts, English UI first with Urdu-ready i18n keys.
- Standard codes are stored where they apply: ICD-10 (diagnosis), LOINC (lab), ATC (drugs). Data shapes follow FHIR, but no FHIR endpoints for MVP.
- Personal data (CNIC, phone, photo, thumbprint) is encrypted at rest. Sensitive fields (salary, HIV results) are hidden at field level.

---

## Phases (detail lives in `hims-tickets.csv`)

One release. Phases are build order by dependency, not separate launches.

| Phase | Name | Epics | Tickets | Est. engineer-days |
|---|---|---|---|---|
| Decision | Decisions | DEC | 7 | 3.5 |
| Phase 0 | Foundations | F0-REPO, F0-API, F0-DB, F0-TEN, F0-AUTH, F0-AUD, F0-EVT, F0-REF, F0-UI, F0-OPS | 61 | 68.5 |
| Phase 1 | Platform core | X-WL, P03, P04, P02, H01, P01, P05, P07, P06 | 88 | 122.5 |
| Phase 2 | Patient access & revenue cycle | C01, C02, C03, C04, C05, C06, C07 | 69 | 99 |
| Phase 3 | Clinical care | X-ENC, X-ORD, X-FORM, C10, C11, C08, C09, C12, C18, C19 | 81 | 130.5 |
| Phase 4 | Diagnostics & specialty services | C13, C14, C15, C16, C17 | 44 | 84.5 |
| Phase 5 | Supply chain & pharmacy | S01, X-STOCK, S02, S03, S04, S05, S06, S07, S08, S09, S10 | 68 | 108.5 |
| Phase 6 | HR & payroll | H02, H03, H04, H05 | 29 | 55 |
| Phase 7 | Finance & revenue extensions | F01, F04, F02, F03, F05, C20, C21, C22 | 47 | 85.5 |
| Phase 8 | Reporting, analytics, operations & integrations | X-RPT, C23, S11, P08, P09, O01, O02, X-INT | 64 | 99.5 |
| Phase 9 | Hardening & go-live | UAT, PERF, SEC, GOLIVE | 13 | 45 |
| Phase 10 | Data migration (deferred per D3) | MIG | 8 | 18.5 |
| | **Total** | | **579** | **920.5** |

Estimates are rough engineer-days for sequencing, not commitments. With 5 engineers working in parallel tracks from Phase 2, expect roughly 10–12 months to go-live, before migration.

## Decisions (2026-10-10)

| ID | Decision |
|---|---|
| D1 | Stack: TypeScript strict, NestJS/Fastify, Postgres 17 + Drizzle, React/Vite, Redis/BullMQ, ClickHouse. **Decided** |
| D2 | Hosting: **cloud** |
| D3 | Migration: **deferred**. Phase 10 |
| D4 | Finance: **ships with everything else in one release** |
| D5 | Task tracker: **`hims-tickets.csv`** |
| D6 | Department sign-off: **CSV columns** `Signed Off`, `Signed Off By`, `Sign-off Date`. Owners still to be named |
| D7 | Interface: **one shared app with per-hospital branding** |

## Risks

| Risk | Mitigation |
|---|---|
| Field "reasons" in the spec are inferred, not confirmed | D6 stakeholder panel answers each doc's "Open questions" before that phase's plan is written |
| Edit and view dialogs and hidden-role screens weren't captured | Short follow-up walkthrough with super-admin access before Phases 2–5 |
| Migration source not available from the vendor | Deferred to Phase 10 (D3). Fallback: export through the observed API endpoints. |
| One big release raises go-live risk | Phases still deliver to staging continuously; department UAT and sign-off per epic; rehearsed go-live with rollback |
| Scope creep from the "Rebuild notes" wish lists | Each phase plan tags rebuild notes as MVP or later. Only MVP-tagged items enter the phase. |
| Hospitals asking for bespoke UI changes that turn into code forks | Every customisation request must map to tenant config (branding, modules, forms, templates, workspace layout). Anything else goes to the product backlog for everyone, never a per-hospital branch. |
| Hardware and integrations (FBR, SMS, biometric, printers) | Integration spikes in Phase 0–1; hardware lab at the hospital before Phase 6 |

## Next step

Start with Phase 0 tickets `F0-REPO-01` onward. Each agent takes one ticket, states its goal (AGENTS.md rule 0), and updates the ticket row.
