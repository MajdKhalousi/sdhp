# Staging Phase Log

**Last updated:** Phase 0E-C19

## Purpose

Short, factual ledger of phases that closed against the staging environment ([Staging-Environment.md](Staging-Environment.md)) — what each one fixed and why it mattered. `git log` has the diffs; this file has the reasoning trail, since that otherwise only exists in chat history.

## Entries

### 0E-C16 — Staging seed + API runtime fixes
**Commit:** `cef4c1f`

Fixed three runtime bugs found while standing up staging: seeded patients had no `ClinicPatient` link (so `GET /patients` returned empty despite patients existing in the database), the API builder image lacked `python3`/`make`/`g++` needed for bcrypt's native-binding fallback build, and the entrypoint had no defensive `prisma generate` step. Mattered because staging would not have functioned as a usable clinic environment without all three — patients would have been invisible, logins could have failed, and the Prisma Client could have gone stale silently.

### 0E-C17 — First Clinic Readiness Browser Walkthrough
**No code commit — verification phase.**

First real browser walkthrough of staging, role by role. Result: ORG_ADMIN, SECRETARY, and DOCTOR passed cleanly; ACCOUNTANT failed on `/dashboard/cashier`. Mattered because it was the first time the deployed staging stack was exercised as a real user would, rather than verified through code reading or container logs — and it caught a real, user-facing bug that planning alone had not surfaced.

### 0E-C18-A — Guard cashier summary rendering
**Commit:** `624726c`

Added defensive guards while diagnosing the ACCOUNTANT cashier crash found in 0E-C17: `cashierSummary.collectionRate` and `cashierSummary.paymentsByMethod` were used unguarded, breaking an established defensive-coercion pattern used elsewhere in the same component. The guards were safe and were retained, but this fix did **not** fully resolve the ACCOUNTANT cashier issue — a separate failure remained (see 0E-C18-B).

### 0E-C18-B — Hide cashier Unbilled tab for roles without appointment-read access
**Commit:** `5e309bf`

Identified and closed the real remaining failure left open by 0E-C18-A: clicking the "Unbilled" tab still triggered a 403 against `GET /v1/appointments`, a role ACCOUNTANT is deliberately excluded from server-side. Fixed by hiding the Unbilled tab (and double-guarding its query) for any role without appointment-read access, rather than broadening backend permissions. Mattered because it closed the walkthrough's last open failure without expanding what ACCOUNTANT can see clinic-wide — ACCOUNTANT no longer triggers the `/appointments` 403 at all.

## Related

- [Staging-Environment.md](Staging-Environment.md)
- [Decision-011 — No Dev Testing on Production Host](../00-Company/Decisions/Decision-011-No-Dev-Testing-on-Production-Host.md)
