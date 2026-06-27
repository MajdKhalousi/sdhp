# Staging Environment

**Last updated:** Phase 0E-C19

## Purpose

Current-state reference for the dedicated `sdhp_staging` Docker Compose stack — where it runs, what's deployed, what data policy applies, and the result of the first browser-based clinic readiness walkthrough run against it.

## Environment Facts

| Fact | Value |
|---|---|
| URL | https://staging.elajihealth.com |
| Hostname | `sdhp-pilot-staging` |
| Deploy path | `/opt/sdhp` |

This is a fully separate stack from production — see [Decision-011](../00-Company/Decisions/Decision-011-No-Dev-Testing-on-Production-Host.md) for why it exists at all. It must never share container names, volumes, or credentials with production.

## Deployment Files

| File | Covers |
|---|---|
| [`docker/docker-compose.staging.yml`](../../docker/docker-compose.staging.yml) | The `sdhp_staging` Compose stack — postgres, redis, minio, api, web, nginx, minio-init, certbot |
| [`docker/nginx/conf.d/sdhp.staging.conf`](../../docker/nginx/conf.d/sdhp.staging.conf) | nginx server block for `staging.elajihealth.com` |
| [`.env.staging.example`](../../.env.staging.example) | Placeholder-only env template — every value must be filled with fresh staging secrets |

**Real secrets live only in `.env.staging` on the server (`/opt/sdhp`) and must never be committed to this repository.** No secret value appears anywhere in this document.

## Staging Demo Data Policy

- Staging runs the same seed data as local development (`apps/api/prisma/seed.ts`) — see [`../../DEMO_USERS.md`](../../DEMO_USERS.md) for the account list.
- Seed/demo data only — **no real patient data may ever be entered on staging.**
- Any manual test record created during a walkthrough must be clearly fake and prefixed `PILOT_WALKTHROUGH_0E_` so it's identifiable and removable.

## First Clinic Readiness Walkthrough — Result

| Role | Result |
|---|---|
| ORG_ADMIN | Passed |
| SECRETARY | Passed |
| DOCTOR | Passed |
| ACCOUNTANT | Passed (after the [Phase 0E-C18 cashier fix](Staging-Phase-Log.md)) |

ACCOUNTANT initially failed on `/dashboard/cashier` (render crash, then a 403 on the Unbilled tab) — both issues are closed; see [Staging-Phase-Log.md](Staging-Phase-Log.md) for the fix history.

## Related

- [Decision-011 — No Dev Testing on Production Host](../00-Company/Decisions/Decision-011-No-Dev-Testing-on-Production-Host.md)
- [Product-Flows.md](../01-Product/Product-Flows.md) — workflow map exercised during the walkthrough
- [Permissions Matrix.md](../architecture/Permissions%20Matrix.md) — role × endpoint grants referenced while diagnosing the ACCOUNTANT issues
- [Staging-Phase-Log.md](Staging-Phase-Log.md) — closed-phase ledger for this environment
