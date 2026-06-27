# Operations

**Last updated:** Phase 0E-C19

## Purpose

Index for operational documentation under EHOS — deployment, backups, staging, and production runbooks.

## Staging

| Document | Covers |
|---|---|
| [Staging-Environment.md](Staging-Environment.md) | Staging URL, host, deploy path, deployment files, demo data policy, First Clinic Readiness Walkthrough result |
| [Staging-Phase-Log.md](Staging-Phase-Log.md) | Closed-phase ledger for the staging environment (0E-C16 onward) |

## Production

Operational detail already exists elsewhere; this index does not duplicate it. Recorded in prior phases; re-verify before production operations — do not assume either document below reflects the live state of the production host without checking:

| Document | Covers |
|---|---|
| [`../../docker/DEPLOY.md`](../../docker/DEPLOY.md) | Full production deployment runbook — environment setup, TLS bootstrap, scheduled backups (local + offsite), certificate renewal, update/rollback procedures |
| [`../architecture/Deployment.md`](../architecture/Deployment.md) | Architecture-level summary of the Docker topology, backup status, and nginx/TLS configuration |

## Backup Status — Recorded in Prior Phases, Re-Verify Before Relying On It

- Local automated backups (PostgreSQL + MinIO) were confirmed installed and healthy in production **as of a prior phase's verification**. This is a point-in-time finding, not a continuously monitored state — re-check directly against the production host (cron status, recent backup file timestamps, integrity check) before treating it as current, especially before any production operation that depends on backups being current.
- Offsite backup replication (Cloudflare R2) existed repo-only as of a prior phase — script and runbook committed but not installed in production, by deliberate operator decision pending real/pilot clinic data. Re-confirm this is still the intended state before assuming it hasn't changed.

## A Note on This Folder

`04-Operations/` now holds real staging documentation (above). Production runbooks still live at `docker/DEPLOY.md` and `../architecture/Deployment.md` — whether those eventually migrate into this folder is a future decision, not part of Phase 0E-C19.

## Related

- [../02-Architecture/README.md](../02-Architecture/README.md)
- [../00-Company/Decisions/Decision-007-EHOS.md](../00-Company/Decisions/Decision-007-EHOS.md)
