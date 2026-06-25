# Decision 005 — Product Inventory First

**Status:** Approved
**Last updated:** Phase 0B

## Purpose

States the order of operations for resuming development: understand what exists before adding to it.

## Decision

No new development phase should start before the current product is inventoried and understood.

## Why This Matters

Phase 0A produced an evidence-based inventory of the codebase (see [../../01-Product/Product-Inventory.md](../../01-Product/Product-Inventory.md)) and found at least one significant case of stale assumptions about what was actually built (Payroll had been documented elsewhere as "not started" when it was, in fact, fully implemented). Building new features on top of an inaccurate mental model of the existing system risks duplicated work, missed dependencies, and decisions made on wrong premises. This decision makes inventory-before-expansion a standing rule, not a one-time exercise.

## Related

- [../../01-Product/Product-Inventory.md](../../01-Product/Product-Inventory.md)
- [Decision-002-First-Business-Goal.md](Decision-002-First-Business-Goal.md)
- [Decision-006-Development-Workflow.md](Decision-006-Development-Workflow.md)
