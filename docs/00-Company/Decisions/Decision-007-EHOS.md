# Decision 007 — EHOS (Elaji Health Operating System)

**Status:** Approved
**Last updated:** Phase 0B

## Purpose

Establishes the documentation system itself as an official, maintained artifact — not an incidental byproduct of individual phases.

## Decision

Create and maintain **EHOS — the Elaji Health Operating System**: the project/company/product management system living inside `/docs`. Future decisions, phases, architecture notes, and product plans should be documented there.

## Why This Matters

Prior to this decision, documentation existed (`docs/architecture/*`, `docs/PROJECT_MASTER_MAP.md`) but had no single owning structure and was found to drift out of date without anyone noticing until an explicit audit (Phase 157A) caught it. EHOS gives the documentation a permanent home with clear sections (`00-Company` through `05-Business`) so that company decisions, product definition, architecture, engineering process, operations, and business context each have one obvious place to live and be kept current.

## Structure

```
docs/
├── 00-Company/       — vision, principles, scope, approved decisions
├── 01-Product/        — product inventory, modules, feature matrix
├── 02-Architecture/   — technical architecture reference
├── 03-Engineering/     — phase process, git workflow, engineering standards
├── 04-Operations/      — deployment, backups, runbooks
└── 05-Business/         — commercial/business documentation
```

The pre-existing `docs/architecture/*.md` files and `docs/PROJECT_MASTER_MAP.md`/`docs/PROJECT_MAP.mmd` remain the detailed technical architecture reference for now — `02-Architecture/README.md` points to them rather than duplicating them. They may be migrated into the EHOS structure in a future phase; that migration is not part of this decision.

## Related

- [../../02-Architecture/README.md](../../02-Architecture/README.md)
- [Decision-005-Product-Inventory-First.md](Decision-005-Product-Inventory-First.md)
