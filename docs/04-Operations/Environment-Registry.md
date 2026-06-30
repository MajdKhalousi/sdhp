# Environment Registry

**Last updated:** Phase 0E-C27-A

## Purpose

A clear, factual registry of every current environment — what it's for, what's on it, and the rules that apply. Cross-reference this before assuming which environment a given action is safe to run against.

## ⚠️ Naming Warning

**The production host's hostname is `sdhp-staging` — but it currently runs the production domain and the production Docker stack.** This was confirmed directly in Phase 0E-C22. Do not infer an environment's actual role from its hostname alone — confirm by domain, Compose project name, and the actual running containers every time.

## Staging

| Fact | Value |
|---|---|
| Domain | https://staging.elajihealth.com |
| Hostname | `sdhp-pilot-staging` |
| IP | Recorded in a prior phase as `167.233.27.179` — re-verify before relying on it |
| Repo path | `/opt/sdhp` |
| Compose file | `docker/docker-compose.staging.yml` (project name `sdhp_staging`) |
| Env file policy | `.env.staging` lives only on the server; `.env.staging.example` (placeholder-only) is the committed template |
| Purpose / data policy | Demo, training, and testing only — seed/demo data allowed, **real patient data never allowed** |
| Current status | Live, passed the First Clinic Readiness Browser Walkthrough (Phase 0E-C17/C18) |

Full detail: [Staging-Environment.md](Staging-Environment.md), [Staging-Phase-Log.md](Staging-Phase-Log.md).

## Production

| Fact | Value |
|---|---|
| Domain | elajihealth.com / www.elajihealth.com |
| Hostname | `sdhp-staging` (see naming warning above) |
| IP | Recorded in a prior phase as `178.105.197.82` — re-verify before relying on it |
| Repo path | `/opt/sdhp` |
| Compose file | `docker/docker-compose.prod.yml` (containers `sdhp_api`, `sdhp_web`, `sdhp_postgres`, `sdhp_redis`, `sdhp_minio`, `sdhp_nginx`, `sdhp_certbot`) |
| Env file policy | `docker/.env.production` lives only on the server, `chmod 600` — never committed |
| Purpose / data policy | Intended for real clinic use once ready; currently demo/internal data only |
| Current status | Updated to latest master (`ed2a85d`) as of **Phase 0E-C45C**, after a verified pre/post-update backup pair and a passing manual smoke test (see `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md` Sprint 14). Contains demo/internal data only — **no real clinic data yet**. Cleanup/re-baseline (**Phase 0E-C26**) is deliberately **deferred until a real clinic actually exists** — not a forgotten step. Before real data enters, an explicit owner decision is still needed on whether to clean this demo data, isolate by new tenant, or create a fresh real-clinic org (see Sprint 14 closure). |

## Production Rules

- No seed script run against production, ever.
- No data reset or deletion without backup, classification, and explicit operator approval — freeze-don't-delete is the default posture (see [Decision-012](../00-Company/Decisions/Decision-012-Pilot-Deployment-Choice.md)).
- A fresh, verified backup before any deploy or other data-affecting action — never assumed from a prior phase's check.

## Backup Summary (high level only)

A local backup cron exists and was confirmed live and healthy as of a prior verification pass (PostgreSQL + MinIO, daily). This is a point-in-time finding — re-verify directly before relying on it for anything destructive. Offsite replication exists repo-ready but is not yet installed on the server, by deliberate deferral. Full detail and exact procedures: [docker/DEPLOY.md](../../docker/DEPLOY.md) §7.

## Related

- [Staging-Environment.md](Staging-Environment.md)
- [Staging-Phase-Log.md](Staging-Phase-Log.md)
- [First-Clinic-Readiness-Gap-List.md](First-Clinic-Readiness-Gap-List.md)
- [Decision-012-Pilot-Deployment-Choice.md](../00-Company/Decisions/Decision-012-Pilot-Deployment-Choice.md)
- [docker/DEPLOY.md](../../docker/DEPLOY.md)
