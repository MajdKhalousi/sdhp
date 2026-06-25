# Architecture

**Last updated:** Phase 0B

## Purpose

Index for technical architecture documentation under EHOS.

## Current Reference

Detailed technical architecture documentation already exists under [`../architecture/`](../architecture/) and at [`../PROJECT_MASTER_MAP.md`](../PROJECT_MASTER_MAP.md) / [`../PROJECT_MAP.mmd`](../PROJECT_MAP.mmd). This Phase 0B pass does not duplicate that content — it remains the authoritative technical architecture reference today:

| Document | Covers |
|---|---|
| [`../PROJECT_MASTER_MAP.md`](../PROJECT_MASTER_MAP.md) | Main human-readable project map and entry point |
| [`../PROJECT_MAP.mmd`](../PROJECT_MAP.mmd) | Mermaid visual system map |
| [`../architecture/System Architecture.md`](../architecture/System%20Architecture.md) | Component diagrams, auth/request flow, multi-tenancy model |
| [`../architecture/Modules.md`](../architecture/Modules.md) | Per-module backend dependencies, route prefixes, role gates |
| [`../architecture/Database Schema.md`](../architecture/Database%20Schema.md) | Full ERD, every model/enum |
| [`../architecture/Permissions Matrix.md`](../architecture/Permissions%20Matrix.md) | Role × endpoint grants |
| [`../architecture/API Map.md`](../architecture/API%20Map.md) | Endpoint inventory |
| [`../architecture/Frontend Structure.md`](../architecture/Frontend%20Structure.md) | Route tree, component map, i18n |
| [`../architecture/Deployment.md`](../architecture/Deployment.md) | Docker topology, backups, runbook map |
| [`../architecture/Product-Roadmap-State.md`](../architecture/Product-Roadmap-State.md) | Per-module build-maturity classification |

These documents carry their own "last verified against commit" discipline (see `PROJECT_MASTER_MAP.md`'s header) — check that stamp before treating their claims as current.

## A Note on This Folder

`02-Architecture/` exists as a placeholder in the EHOS structure for now. Whether and when the documents above get migrated or restructured into this folder is a future decision, not part of Phase 0B — this README exists so EHOS has a complete top-level structure without duplicating already-good content.

## Related

- [../01-Product/Product-Inventory.md](../01-Product/Product-Inventory.md)
- [../00-Company/Decisions/Decision-007-EHOS.md](../00-Company/Decisions/Decision-007-EHOS.md)
