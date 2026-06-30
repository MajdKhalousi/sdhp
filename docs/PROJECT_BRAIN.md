# Project Brain — Elaji Health (SDHP)

**Last updated:** Phase 0E-C27-A

## Purpose

The front door for any new AI conversation about this project. Paste or upload this file at the start of a new ChatGPT (or other AI) conversation so it understands Elaji Health without relying on chat memory. This file is a pointer map, not an archive — it links to detailed docs instead of duplicating them. If this file ever grows much past 150 lines, that's a sign content escaped into it that belongs in [Operating-Model.md](03-Engineering/Operating-Model.md) or [Environment-Registry.md](04-Operations/Environment-Registry.md) instead.

## Project Identity

**Elaji Health** (internal codename **SDHP**) — a multi-tenant SaaS clinic/hospital management platform. A single deployment serves many independent healthcare organizations ("clinics"), each with the full operational stack: patient records, scheduling, clinical documentation, billing, labs/radiology, and HR.

## Product Summary

Covers the full patient visit lifecycle inside a clinic — registration → booking → check-in → clinical encounter → orders (labs/radiology) → billing → payment — plus the operational backbone a clinic needs to run itself (staff accounts, HR, reporting) and the platform backbone the SaaS operator needs to run the business (tenant onboarding, subscription billing, audit oversight). Bilingual, Arabic-first with full RTL support. Full detail: [PROJECT_MASTER_MAP.md](PROJECT_MASTER_MAP.md).

## Source-of-Truth Rule

**Repo docs, `git log`, and actual server/command output are truth. AI memory (mine or any other assistant's) is not.** If something below looks stale or contradicts what you observe directly, trust what you observe and flag the conflict — don't let an AI's prior summary override current reality.

## Current Status

- **Staging** exists for demo/training/testing only — never real patient data.
- **Production** is updated as of **Phase 0E-C24**.
- Production currently contains **demo/internal data only** — no real clinic data yet.
- **Phase 0E-C26** (production cleanup/re-baseline) is **deferred until a real clinic actually exists** — not yet started.
- **`MedicalServiceRequest`** (closed 2026-06-28) — full feature closed: backend lifecycle, billing link, patient-profile tab, timeline integration, and a cross-patient work queue, verified on staging. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 3 closure for what shipped, behavior by role, and known limitations.
- **Prescription Templates** (closed 2026-06-29) — clinic-wide templates managed in Settings by admins, applied by doctors inside Encounter; quantity/refills visibility and related clinical-text RTL/bidi polish verified on staging. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 4 closure.
- **Patient Medical File v2 — narrow improvements** (closed 2026-06-29) — added "Last prescription" to the existing Clinical Summary card and a grouped Billing quick-filter to the Patient Timeline; deliberately kept narrow after planning found most of the originally-suggested scope already existed. Appointment-on-timeline and a Notes filter remain open, deferred decisions, not rejections. Verified on staging. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 6 closure.
- **Accounts/Profile/Password/Permissions Cleanup** (closed 2026-06-29) — a verification arc, not a rebuild: profile management, self-service change-password, and admin staff-account CRUD were all found already complete. Permissions Matrix verified and `BRANCH_ADMIN` documented as intentionally narrow (must not be broadened silently). Audit-log coverage for account/security actions verified; a few medium/low-priority gaps (failed-login not logged, generic edit-form `isActive` toggles not distinctly labeled) documented and deliberately deferred, not fixed. No code changed in this arc. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 7 closure and `architecture/Permissions Matrix.md`.
- **Reports / Clinic Intelligence v1 — current slice** (closed 2026-06-29) — Reports Summary (`/dashboard/reports/summary`) and Appointment Reports (`/dashboard/reports/appointments`) added, consuming the already-existing `/v1/reports/summary` and `/v1/reports/appointments` endpoints; one small backend fix made summary's patient counts period-aware. Summary is a high-level overview, Appointment Reports is the detailed appointment page; the sidebar shows one consolidated "Reports" entry with local tabs between the two. Billing Reports is unrelated and untouched. No RBAC change — both pages match backend `@Roles(SUPER_ADMIN, ORG_ADMIN, DOCTOR)` exactly, `BRANCH_ADMIN` not added. Clinical/Queue report pages, top-doctors, service/category summaries, and any export/report-builder remain deferred. Verified on staging. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 8 closure.
- **Visit Reports (Clinical)** (closed 2026-06-29) — added a third page/tab to the Reports Hub at `/dashboard/reports/clinical` ("Visit Reports"/"تقارير الزيارات"), consuming the already-existing `/v1/reports/clinical`; 6 direct-field cards, no breakdown, no computed KPIs. Sidebar stays a single "Reports" entry, active on all three hub routes but not on Billing Reports. No RBAC change — matches backend `@Roles(SUPER_ADMIN, ORG_ADMIN, DOCTOR)` exactly, `BRANCH_ADMIN` not added. Documented (not fixed): the endpoint's prescription counts are organization-scoped only, not branch-scoped, unlike its encounter counts. Trimming Reports Summary's now-overlapping Encounters/Prescriptions totals remains a deferred, separate decision. Verified on staging. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 9 closure.
- **Reports Hub UX / Information Architecture Polish** (closed 2026-06-29) — reviewed and trimmed Reports Summary down to a lightweight cross-domain front door (Staff total, Patients total, Active patients, Appointments today/upcoming, Queue total, Queue by Status); removed its two exact-duplicate cards (Encounters/Visits Total, Prescriptions Total — both already owned by Visit Reports). Appointment Reports, Visit Reports, and Billing Reports are all unchanged. Queue Reports and a Billing-into-hub migration were evaluated and explicitly deferred, not rejected. No backend, API, or RBAC changes. Verified on staging. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 10 closure.
- **Cashier/Billing Operational Polish** (closed 2026-06-30) — a safety/UX review ahead of first clinic trial, not a redesign: full invoice lifecycle and Cashier Today/Outstanding action set reviewed and found already well-guarded (zero-amount, zero-remaining, overpayment, tenant isolation, RBAC, audit logging all confirmed correct). The one concrete gap — English-only backend error text reaching Arabic cashier sessions — was fixed by mapping five known billing `BadRequestException` messages to a new, friendly `billing.errors.*` i18n namespace. No backend, billing-logic, RBAC, or payment-tolerance changes. Staging confirmed the Arabic cashier overpayment experience is friendly end-to-end, though that specific test exercised the pre-existing client-side validation message, not the new backend-error-mapping keys directly — noted explicitly rather than overstated. Several items (tolerance alignment, NURSE invoice-read access, a payment-form refactor) remain open, deferred decisions. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 11 closure.
- **Patient Creation Quality / First Clinic Trial Readiness** (closed 2026-06-30) — grew out of the C43A trial-readiness audit's one concrete data-quality finding (duplicate-phone-within-org not enforced). Fixed a stale-acknowledgement bug in the duplicate-patient soft warning (editing phone after the warning showed didn't invalidate the old "Create Anyway"), then found and fixed a deeper regression it surfaced — the warning's only escape hatch was hidden whenever the match was already linked to the org, true for nearly every real case, making a soft warning behave like a hard block. Added a second, independent soft confirmation for entirely-blank optional sections (family/additional/medical/emergency), sequenced strictly after the duplicate gate, with its own separately-scoped stale-payload reset. Along the way, found and removed a non-functional "Allergies" textarea on the patient form — collected in local state but never sent on create or update, a silent clinical-data-loss risk; the real, structured `Allergy[]` feature and its patient-profile display were confirmed untouched. All four phases frontend-only, no backend/schema/RBAC changes, all staging-verified. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 12 closure.
- **Cancel Encounter / Abandon Visit** (closed 2026-06-30) — closed the encounter-lifecycle gap deferred from Sprint 12 (and originally identified in the C43A audit): a doctor had no graceful way to abandon a mistaken visit short of completing it empty or asking an admin to use an endpoint DOCTOR couldn't reach. New `PATCH /v1/encounters/:id/cancel` (SUPER_ADMIN/ORG_ADMIN/DOCTOR, DOCTOR own-encounter only) reuses the existing soft-delete (`deletedAt`) mechanism rather than a new status field — confirmed Visit Reports and the patient timeline already exclude `deletedAt`-set encounters, so neither needed code changes. Rejects already-completed or already-cancelled encounters; writes the first-ever audit log entry for an `Encounter` mutation in this codebase (`create`/`remove` still write none); writes no patient-facing timeline event, after confirming the timeline-writer table isn't read by the patient-facing endpoint at all; transactionally reverts a linked in-progress appointment to `CANCELLED` and queue entry to `SKIPPED`. Frontend adds a clearly-secondary "Cancel Visit"/"إلغاء الزيارة" action beside "Complete Visit," with a confirmation dialog and optional reason — a dirty-state visibility bug (copied from `EndEncounterButton`'s condition, would have hidden Cancel whenever the form had unsaved edits) was caught and fixed during diff review before commit. Permissions Matrix gained one new row for the endpoint; no existing role or endpoint changed. Fully staging-verified end-to-end, including a real appointment/queue propagation and an Appointment Reports count increment. See `elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 13 closure.
- Full detail: [Environment-Registry.md](04-Operations/Environment-Registry.md), [Staging-Phase-Log.md](04-Operations/Staging-Phase-Log.md), [First-Clinic-Readiness-Gap-List.md](04-Operations/First-Clinic-Readiness-Gap-List.md).

## Competitor Awareness: MedPro

- MedPro is a direct/near-direct competitor with broad ERP-style clinic coverage (patients, billing, inventory, accounting, settings).
- Elaji should differentiate through modern UX, clean workflow, security, audit logs, tenant isolation, and clinical timeline — not feature-count parity.
- Do not copy MedPro's UI complexity.
- Do not expand into inventory or full accounting before the Healthcare Core MVP (patient → appointment/queue → visit → encounter → prescription → billing → timeline → reports → audit logs) is strong.
- Full detail: [strategy/COMPETITOR_MEDPRO_AUDIT.md](strategy/COMPETITOR_MEDPRO_AUDIT.md).

## AI Collaboration Model

| Role | Who | Function |
|---|---|---|
| Owner / Product Manager / Operator | User | Decides scope, approves plans, approves diffs, runs server commands |
| Planner / Architect / Reviewer / Risk Controller | ChatGPT | Plans phases, reviews risk, does not implement |
| Implementer / local coding agent | Claude | Implements only approved scope, never SSHes, never decides scope unilaterally |

Full detail: [Operating-Model.md](03-Engineering/Operating-Model.md).

## Non-Negotiable Rules

- No implementation without planning.
- No commit without diff review.
- No production deploy without a fresh backup.
- No seed script run on production, ever.
- No casual `docker compose down`.
- No data deletion without backup + classification + explicit operator approval.
- No `git add .` / `git add -A` — stage specific files only.
- Claude does not SSH and does not touch servers directly.
- The user runs server commands manually; Claude/AI only proposes them.
- If a phase changes a decision, environment state, workflow, architecture rule, API standard, operating standard, or source-of-truth reference, update the relevant docs in the same phase before closing it, or explicitly mark the docs update as deferred.

## Phase Workflow

**Planning → Approval → Implementation → Diff Review → Commit → Deploy → Verify → Close**

Full 11-step version (idea through close-phase, with business/architecture review steps): [Phase-Process.md](03-Engineering/Phase-Process.md).

## New Chat Startup Protocol

1. Start a new ChatGPT conversation.
2. Paste or upload this file (`docs/PROJECT_BRAIN.md`) as the first message.
3. If anything in "Current Status" above looks like it might be stale, ask the user to confirm before proceeding — do not assume it's still current just because it's written down.
4. For anything needing more detail than this file provides, follow the links below rather than guessing.

## Links to Detailed Docs

- [PROJECT_MASTER_MAP.md](PROJECT_MASTER_MAP.md) — product/architecture source of truth
- [01-Product/Product-Flows.md](01-Product/Product-Flows.md) — workflow map
- [architecture/Permissions Matrix.md](architecture/Permissions%20Matrix.md) — role × endpoint grants
- [00-Company/Vision.md](00-Company/Vision.md), [00-Company/Core-Principles.md](00-Company/Core-Principles.md), [00-Company/Product-Scope.md](00-Company/Product-Scope.md)
- [00-Company/Decisions/](00-Company/Decisions/) — all numbered decisions, especially [Decision-006](00-Company/Decisions/Decision-006-Development-Workflow.md) (dev workflow), [Decision-011](00-Company/Decisions/Decision-011-No-Dev-Testing-on-Production-Host.md) (no dev testing on prod), [Decision-012](00-Company/Decisions/Decision-012-Pilot-Deployment-Choice.md) (pilot deployment choice)
- [03-Engineering/Operating-Model.md](03-Engineering/Operating-Model.md) — full AI/human collaboration model
- [03-Engineering/Phase-Process.md](03-Engineering/Phase-Process.md), [03-Engineering/Git-Workflow.md](03-Engineering/Git-Workflow.md)
- [04-Operations/Environment-Registry.md](04-Operations/Environment-Registry.md) — staging/production facts
- [04-Operations/Staging-Environment.md](04-Operations/Staging-Environment.md), [04-Operations/Staging-Phase-Log.md](04-Operations/Staging-Phase-Log.md)
- [04-Operations/First-Clinic-Readiness-Gap-List.md](04-Operations/First-Clinic-Readiness-Gap-List.md)
- [DEMO_USERS.md](../DEMO_USERS.md) — demo/staging account directory (not production credentials)
- [docker/DEPLOY.md](../docker/DEPLOY.md) — production deployment runbook
- [strategy/COMPETITOR_MEDPRO_AUDIT.md](strategy/COMPETITOR_MEDPRO_AUDIT.md) — competitor audit and strategic positioning vs. MedPro
