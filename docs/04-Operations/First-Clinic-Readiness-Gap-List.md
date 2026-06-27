# First Clinic Readiness Gap List

**Last updated:** Phase 0E-C20

## Purpose

A prioritized, practical gap list for taking this product from "staging works" to "ready for a first real/pilot clinic" — what must be decided or fixed first, what can wait, and what is deliberately out of scope for now.

## Readiness Summary

- Staging is solid for demo/training purposes.
- The First Clinic Readiness Browser Walkthrough ([Staging-Phase-Log.md](Staging-Phase-Log.md), 0E-C17) passed for ORG_ADMIN, SECRETARY, DOCTOR, and ACCOUNTANT.
- The app's core clinic workflow (reception → queue → doctor → billing) is usable on staging today.
- But a real/pilot clinic requires stricter decisions than a demo does — specifically around where real data lives, backup/readiness verification on that deployment, data isolation from seed/demo data, and operator training. None of the staging-hardening work to date (0E-C16 through 0E-C19) addressed any of these.

## Prioritized Gap List

| # | Gap | Category | Priority | Notes / Decision Needed |
|---|---|---|---|---|
| 1 | No explicit decision on where real pilot clinic data will live: existing production deployment vs. a new dedicated pilot deployment | Operational | P0 Blocker | Must be decided before anything else in this list can be acted on — see 0E-C21 below |
| 2 | Fresh backup/security/readiness verification is required on whichever deployment will hold real patient data | Clinical safety / data-integrity | P0 Blocker | Do not phrase this as production-only unless production is the deployment actually chosen in 0E-C21 |
| 3 | No confirmed answer on whether real clinic data and demo/seed data could coexist or collide on the chosen deployment | Clinical safety / data-integrity | P0 Blocker | Seed/demo data must not be mixed with real patient data on whichever deployment is chosen |
| 4 | Follow-up reminders have no real delivery mechanism | UX / clinical | P1 Important before pilot | Only a hard blocker if the pilot clinic specifically expects SMS/call reminders to go out; depends on the still-empty Notifications module |
| 5 | Same-organization duplicate-phone detection on Patients is not enforced | Clinical safety / data-integrity | P1 Important before pilot | Real risk once real walk-in volume starts |
| 6 | No staging-to-production (or staging-to-real-deployment) fix-promotion runbook | Operational | P1 Important before pilot | Needed regardless of which deployment 0E-C21 selects |
| 7 | Receptionist / Clinic Admin onboarding material for Decision 009 and Decision 010 does not exist | UX / training | P1 Important before pilot | Decisions exist; pilot-facing onboarding material communicating them does not |
| 8 | [Product-Flows.md](../01-Product/Product-Flows.md)'s Cashier/Accountant readiness notes are stale after the 0E-C18 cashier fixes | UX / training (docs accuracy) | P2 Useful after pilot starts | That table currently says "no risk found," written before 0E-C17/C18 found two real ACCOUNTANT bugs |
| 9 | Offsite backup replication needs re-confirmation once real/pilot data exists | Operational | P2 Useful after pilot starts | Previously deferred "until real/pilot clinic data exists" — that condition is about to become true |
| 10 | No staff self-registration/invite flow | Permissions / account management | P2 Useful after pilot starts | Every account is admin-created today; friction, not a blocker |
| 11 | BRANCH_ADMIN full enforcement/delegation | Permissions / account management | P3 Later / not now | Only relevant if the pilot clinic actually requires branch-level separation |
| 12 | Notifications module build-out | Product scope | P3 Later / not now | See "Do Not Work On Now" below |
| 13 | Inventory/stock decision | Product scope | P3 Later / not now | See "Do Not Work On Now" below |
| 14 | AI Assistant | Product scope | P3 Later / not now | See "Do Not Work On Now" below |
| 15 | Patient Portal | Product scope | P3 Later / not now | See "Do Not Work On Now" below |
| 16 | Payment gateway integration | Product scope | P3 Later / not now | See "Do Not Work On Now" below |

## Recommended Next Phases

1. **0E-C21 — Pilot Deployment Decision.** Where does the real pilot clinic's data live: existing production deployment, or a new dedicated pilot deployment? Blocks gaps #1-3.
2. **0E-C22 — Real-Data Deployment Readiness Re-Verification.** Fresh, dated backup/security/readiness check on whichever deployment 0E-C21 selects — not inherited from a prior phase's claim.
3. **0E-C23 — Data Isolation Confirmation.** Explicit verification that real clinic data and demo/seed data cannot collide on the chosen deployment.
4. **0E-C24 — Onboarding Material for Decision 009/010.** Concrete, pilot-facing material for the two confirmed UX/training risks (gap #7).
5. **0E-C25 — Staging-to-Real-Deployment Promotion Runbook.** Document how a fix verified on staging actually reaches the chosen real deployment (gap #6).

## Do Not Work On Now

Notifications module build-out, the Inventory/stock decision, AI Assistant, Patient Portal, and payment gateway integration are all intentionally deferred until after the real pilot deployment path is decided (0E-C21). None of these block a first pilot; starting any of them now would be scope creep relative to getting one real clinic running safely.

## Related

- [Staging-Environment.md](Staging-Environment.md)
- [Staging-Phase-Log.md](Staging-Phase-Log.md)
- [README.md](README.md)
- [Product-Flows.md](../01-Product/Product-Flows.md)
- [Decision 009 — Reception Daily Command Center](../00-Company/Decisions/Decision-009-Reception-Daily-Command-Center.md)
- [Decision 010 — HR Employee vs User Account](../00-Company/Decisions/Decision-010-HR-Employee-vs-User-Account.md)
- [Decision 011 — No Dev Testing on Production Host](../00-Company/Decisions/Decision-011-No-Dev-Testing-on-Production-Host.md)
