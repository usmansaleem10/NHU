# ADR NNNN: <short decision title>

- **Status:** Proposed | Accepted | Superseded by ADR NNNN | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** <names or roles>
- **Tickets:** <ticket IDs from hims-tickets.csv>

## Context

What problem are we solving? Include the forces at play: requirements, constraints, what the legacy system did wrong (link `docs/spec/` where it applies), and anything already decided in the roadmap or AGENTS.md.

## Decision

What we will do, stated as rules a contributor can follow ("We will…", "X must…"). Be specific enough that a reviewer can tell whether a change follows it.

## Consequences

- **Positive:** what this makes easier or safer.
- **Negative / costs:** what this makes harder, and what we accept.
- **Follow-ups:** tickets or guardrails (lint rules, tests, CI checks) that enforce the decision.

## Alternatives considered

| Option | Why not |
|---|---|
| <alternative> | <reason> |

---

How to use this template:

- Copy to `docs/adr/NNNN-kebab-title.md` with the next free number. Never renumber or delete an ADR.
- An accepted ADR is not edited for substance. To change a decision, write a new ADR that supersedes it and set the old one's status to `Superseded by ADR NNNN`.
- AGENTS.md says the stack is fixed and "changes need an ADR". That ADR is merged before the change it allows.
