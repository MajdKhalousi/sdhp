# Decision 012 — Pilot Deployment Choice

**Status:** Accepted
**Date/Phase:** Phase 0E-C21

## Purpose

Decide where the first real/pilot clinic's real patient data will live, before any real patient data is entered anywhere.

## Decision

The first real/pilot clinic will run on a **new dedicated pilot deployment/server** — not on the current staging deployment, and not on the existing production deployment unless a future explicit re-verification changes that decision.

## Options Considered

### 1. Use existing production deployment

**Pros:** Already built and hardened — TLS/HSTS, auth rate-limiting, Swagger disabled, automated migrations, and a backup cron confirmed live and healthy as of a prior phase. Zero new infrastructure cost or setup time; a full deployment/update/rollback runbook already exists.

**Cons/Risks:** Its current tenant/data state was not freshly verified in this phase — whether it holds zero organizations, leftover seed/demo residue, or something else is unconfirmed. Onboarding a real clinic onto an unverified deployment carries unknown risk.

**Recommendation:** Not chosen now. Remains viable in the future only after an explicit, dedicated re-verification phase confirms its current data state.

### 2. Create new dedicated pilot deployment/server

**Pros:** Clean data isolation and clean secrets by construction — no unknowns to verify away. Clear operational boundary for the first real clinic. The staging build effort already proved out the Compose/TLS/nginx pattern needed, so this is low-effort, not a cold start.

**Cons/Risks:** Ongoing hosting cost; a second full set of certs/backups/cron/monitoring to maintain; a later decision is needed about whether this deployment eventually becomes permanent production or is retired/merged.

**Recommendation:** **Chosen.** Safest, lowest-ambiguity option for first real patient data.

### 3. Convert staging to pilot

**Pros:** None worth counting.

**Cons/Risks:** Staging is documented and relied upon as demo/training/testing only ([Staging-Environment.md](../../04-Operations/Staging-Environment.md), [DEMO_USERS.md](../../../DEMO_USERS.md)). It contains seed/demo data and widely-documented demo credentials (`password123` for every account). Repurposing it would require a full data purge and credential rotation, and would contradict documentation other people may already be relying on.

**Recommendation:** Not recommended. Rejected.

## Final Choice

**Option 2 — New dedicated pilot deployment/server.**

## Rationale

- Staging is documented and relied upon as demo/training/testing only.
- Staging contains seed/demo data and demo credentials.
- Existing production may be technically mature, but its current tenant/data state is not freshly verified in this phase.
- A new dedicated pilot deployment gives clean data isolation, clean secrets, and a clear operational boundary for the first real clinic.

## Explicit Rejected Options

- Do not convert staging to pilot.
- Do not put real clinic data into any deployment that contains seed/demo data.
- Do not assume existing production is clean without a fresh direct verification phase.

## Required Preconditions Before Real Data

1. New pilot host or deployment target selected.
2. Fresh secrets generated; never copied from staging.
3. Dedicated compose project/container/volume names, for example `sdhp_pilot`.
4. Domain selected and DNS/TLS prepared, for example `pilot.elajihealth.com`.
5. Backup/restore verification completed on the chosen pilot deployment.
6. No seed/demo data remains before onboarding the real clinic.
7. Real clinic organization/user creation procedure documented.
8. Staging-to-pilot fix-promotion path documented later.

## Data Isolation Rules

- Real patient data and seed/demo data must never share one deployment.
- Staging remains demo/training/testing only.
- `PILOT_WALKTHROUGH_0E_` fake test records are staging-only and must not be used on the real pilot deployment.

## Next Phase

**Phase 0E-C22 — Dedicated Pilot Deployment Planning / Provisioning Plan.** Define host specs, domain, compose project name, env policy, backup policy, and deployment checklist for the new dedicated pilot deployment.

## Related

- [Decision 011 — No Dev Testing on Production Host](Decision-011-No-Dev-Testing-on-Production-Host.md)
- [Staging-Environment.md](../../04-Operations/Staging-Environment.md)
- [First-Clinic-Readiness-Gap-List.md](../../04-Operations/First-Clinic-Readiness-Gap-List.md)
