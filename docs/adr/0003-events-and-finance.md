# ADR 0003: Domain events through an outbox, and finance driven by posting rules

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Product owner and engineering lead (roadmap decisions D1, D4)
- **Tickets:** F0-EVT-*, F04 (posting rules), F01 (chart of accounts)

## Context

Finance ships in the same release as everything else (D4), but the finance screens may go live after billing, pharmacy and stores. The go-live gate requires that every billable and stock event creates an accounting posting event, stored even before the finance screens exist, so no history is lost.

The legacy system put chart-of-accounts fields on operational setup records (services, products, stores). Accounting knowledge then leaked into every master screen, and changing an account mapping meant editing operational data. Posted documents could also be edited in place, which breaks the audit trail.

## Decision

**Domain events and the outbox**

- Every change that moves **money or stock** emits a **domain event** (`<feature>.events.ts` declares a feature's events).
- The event is written to the **outbox table in the same database transaction** as the change itself. Either both commit or neither does. There is no "save, then publish" step that can half-fail.
- A relay reads the outbox and dispatches events to consumers (posting, analytics, notifications) through BullMQ. Delivery is **at least once**, so every consumer is idempotent, keyed by the event ID.
- Outbox rows carry `tenant_id` and `branch_id` and are tenant-isolated by RLS like every other table (ADR 0002). High-volume event tables are time-partitioned.
- The same events feed analytics (ClickHouse, Phase 7b).

**Finance**

- **No chart-of-accounts fields on operational or master tables.** A service, product, store or department never stores a GL account.
- **Posting rules** (F04) map events to journal entries: event type plus attributes (tenant, branch, department, payment method, item category, and so on) decide which accounts are debited and credited. Rules are tenant configuration, versioned, and testable on their own.
- Events are stored from day one even with no posting rules configured, so they can be posted later without loss.
- **Posted financial records are immutable.** A posted journal entry, invoice or receipt is never updated or deleted. Corrections are **reversals** (a new entry that negates the original), followed by a correct new entry when needed.
- Money is `numeric(14,2)` in the database and a decimal type in code, never a JS `number`. Journal entries must balance (debits equal credits), and tests cover the money maths.

## Consequences

- **Positive:** operations and accounting are decoupled, so finance can change mappings without touching masters. No billable or stock movement is lost, even before finance goes live. The ledger has a complete, append-only audit trail. Analytics gets a clean event stream.
- **Negative / costs:** posting is eventually consistent; balances lag the operation by the relay's latency. Consumers must be idempotent. Reversal-only correction adds entries and needs good UI for "reverse and re-issue". Unconfigured events must be visible to finance so they get mapped.
- **Follow-ups:** F0-EVT (outbox table, relay, idempotent consumer helper), F01 (chart of accounts), F04 (posting rules engine), F0-AUD (audit log of every write). Each money or stock feature ships with a test proving the event is written in the same transaction.

## Alternatives considered

| Option | Why not |
|---|---|
| Account fields on masters (legacy) | Accounting leaks into operational screens; remapping means editing operational data |
| Publish to the queue after commit | A crash between commit and publish loses the event |
| Distributed transaction across DB and queue | Complex, and not needed when the outbox shares the business transaction |
| Synchronous posting inside the business transaction | Couples every sale to the finance configuration; a missing rule would block the front desk |
| Editable posted documents | Breaks the audit trail and the go-live requirement of immutable postings |
