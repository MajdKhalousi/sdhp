# Elaji Implementation Roadmap

**Status:** Active — first 5 sprints drafted, derived from `ELAJI_GAP_ANALYSIS.md`'s gap table and domain model section (first pass, 2026-06-28).

## Purpose

The actual build roadmap for Elaji Health, derived from `ELAJI_GAP_ANALYSIS.md` decisions. This document is where MedPro-informed research turns into committed, sequenced Elaji work — phases, priority, and scope.

This document does not itself authorize implementation. Per the project's standard phase workflow (`docs/PROJECT_BRAIN.md` → Phase Workflow), each roadmap item still goes through Planning → Approval → Implementation → Diff Review → Commit → Deploy → Verify → Close before any code is written. **Nothing below has been implemented.**

---

## First 5 Implementation Sprints

### Sprint 1 — Financial events on the patient medical timeline

- **Goal:** Add `INVOICE_ISSUED` and `PAYMENT_RECORDED` to `MedicalTimelineEventType`, and write a `MedicalTimelineEvent` whenever an invoice is issued or a payment is recorded, so financial activity becomes visible on the existing patient timeline.
- **Why now:** Smallest, lowest-risk gap identified in the entire pass (`ELAJI_GAP_ANALYSIS.md` §4). Purely additive — no existing behavior changes, no existing data reinterpreted.
- **Files likely affected:** `apps/api/prisma/schema.prisma` (enum value additions only), `apps/api/src/modules/billing/billing.service.ts` (call sites where invoices are issued / payments recorded), the timeline-writing helper already used elsewhere (whatever `MedicalTimelineEvent` writer is shared across modules — needs to be located, not assumed), `apps/web/src/components/patients/timeline/timeline-tab.tsx` (render the two new event types).
- **Backend impact:** Two new enum values; two new `.create()` call sites for `MedicalTimelineEvent` inside existing billing flows. No new endpoints.
- **Frontend impact:** Timeline tab needs a label/icon for the two new event types (i18n keys in `en.json`/`ar.json`).
- **Database/schema impact:** Enum value addition to `MedicalTimelineEventType` — additive, requires a migration but not a destructive one (no column changes, no data migration).
- **Permission/audit impact:** None new — timeline read access already follows existing patient-file permission gates; this only adds event types within the existing model.
- **Tests/checks:** Unit/integration test that issuing an invoice and recording a payment each produce exactly one new timeline event with correct `patientId`/`organizationId`; manual check that the timeline tab renders both new types without breaking existing event rendering.
- **Acceptance criteria:** Issuing an invoice or recording a payment for a patient produces a visible, correctly-labeled entry on that patient's timeline tab, in both English and Arabic, with no change to any other timeline event's rendering.

### Sprint 2 — Inspect and (if needed) close the visit clinical-detail gap in the patient file

- **Goal:** Resolve the open question from `ELAJI_GAP_ANALYSIS.md` §1 row 4 / §2: does `patient-appointments-tab.tsx` (or any other patient-file tab) surface `Encounter` clinical detail (chief complaint, diagnosis) inline? If not, add a minimal expandable-row or linked view, matching MedPro's confirmed expand-to-see-clinical-detail pattern (video 04).
- **Why now:** This is a confirmed user-facing gap candidate sitting directly on the "patient file as central workspace" focus area (the #2 highest-priority focus area in this report) — but it must start with inspection, since the current state is genuinely unconfirmed, not assumed-missing.
- **Files likely affected:** `apps/web/src/components/patients/patient-appointments-tab.tsx`, possibly `apps/web/src/components/encounters/*` (if a dedicated encounter detail view already exists and just needs linking from this tab).
- **Backend impact:** Likely none if `Encounter` data is already returned by an existing endpoint; possibly a small query/include change if the appointments-tab endpoint doesn't currently join encounter data.
- **Frontend impact:** Either confirm-and-document (no code change) or add an expand/link affordance on each appointment row that has a completed encounter.
- **Database/schema impact:** None — `Encounter` already exists and is already linked to `Appointment`.
- **Permission/audit impact:** Must respect existing encounter read permissions (likely DOCTOR/NURSE/ORG_ADMIN, consistent with clinical-data access elsewhere) — needs explicit confirmation during inspection, not assumption.
- **Tests/checks:** Manual verification in the browser: open a patient with at least one completed encounter, confirm clinical detail is (or is not) visible from the appointments tab; if added, verify it's hidden for roles without clinical-read access.
- **Acceptance criteria:** Either a documented confirmation that this already works as expected (no code change needed), or a working, permission-respecting way to see an appointment's encounter clinical detail from the patient file without leaving the page.

### Sprint 3 — `MedicalServiceRequest` execution tracking (design + schema only, no UI yet)

- **Goal:** Design and, if approved, add a `MedicalServiceRequest` model that tracks a requested service's execution status independently of its payment status — the clearest concrete domain gap identified (`ELAJI_GAP_ANALYSIS.md` §4).
- **Why now:** This is the single largest confirmed structural gap, but it's also the riskiest to rush — it needs its own status-lifecycle design (requested → in progress → completed? or just a boolean?) before any schema work, consistent with this report's own open questions.
- **Files likely affected:** `apps/api/prisma/schema.prisma` (new model), a new `medical-service-requests` module (controller/service/DTOs) if approved, `apps/web/src/components/patients/*` for a future request-list view (deferred to a later sprint — this sprint is schema/backend only).
- **Backend impact:** New model, new module, new endpoints (create/list/update-execution-status), tenant-scoped and patient-scoped per the existing pattern (`assertOwnership`-style guards).
- **Frontend impact:** None in this sprint — deliberately deferred so the data model is validated against real usage before UI investment.
- **Database/schema impact:** New table, new migration — the first non-additive schema change in this roadmap. Needs its own focused planning pass before implementation (per `docs/PROJECT_BRAIN.md` phase workflow).
- **Permission/audit impact:** Needs explicit role-gate decisions (who can request a service, who can mark it executed — likely DOCTOR/NURSE/TECHNICIAN for execution, SECRETARY/ORG_ADMIN for requesting) and audit logging on creation/status changes, consistent with how invoices/payments are already audited.
- **Tests/checks:** New endpoint tests for create/list/status-transition, tenant-isolation test (cross-org access denied), role-gate tests.
- **Acceptance criteria:** A service request can be created against a patient, tracked through an execution status independent of any invoice's payment status, and is fully tenant- and role-scoped — with no UI yet (UI is a follow-on sprint).

### Sprint 4 — Prescription templates

- **Goal:** Allow a doctor to save a prescription as a reusable template and create a new prescription from one, addressing the "save as template" gap (`ELAJI_GAP_ANALYSIS.md` §2, MedPro video 04).
- **Why now:** Concrete, doctor-facing time-saver with low architectural risk — purely additive to the existing `Prescription` model area, no interaction with billing/queue/tenant-isolation-sensitive code paths.
- **Files likely affected:** `apps/api/prisma/schema.prisma` (new `PrescriptionTemplate` model), `apps/api/src/modules/prescriptions/*`, `apps/web/src/components/patients/prescriptions-tab.tsx` or equivalent (needs confirmation of exact current component name during planning).
- **Backend impact:** New model + minimal CRUD endpoints (likely scoped per-doctor or per-organization — needs a decision during planning).
- **Frontend impact:** "Save as template" action on an existing prescription form; "Use template" picker when creating a new prescription.
- **Database/schema impact:** New table, additive migration.
- **Permission/audit impact:** Template CRUD likely DOCTOR-only (mirrors who can write prescriptions today) — needs confirmation against existing `prescriptions.controller.ts` role gates during planning, not assumed.
- **Tests/checks:** Create/list/use-template endpoint tests; manual check that using a template correctly pre-fills a new prescription without mutating the template.
- **Acceptance criteria:** A doctor can save any prescription as a named template and create a new prescription from a saved template in under the time it takes to retype it.

### Sprint 5 — Clinic-level patient-file field visibility (design only)

- **Goal:** Produce a concrete design (not implementation) for whether/how Elaji should support per-clinic toggling of which clinical fields appear on the patient file, addressing the largest remaining MedPro-inspired gap (`ELAJI_GAP_ANALYSIS.md` §2, video 06).
- **Why now:** This is explicitly the most architecturally significant and least-justified-by-confirmed-Elaji-need gap in this report — it deserves a dedicated design pass (with real clinic/specialty examples) before any schema commitment, not a rushed implementation.
- **Files likely affected:** None yet — this sprint produces a design document only (e.g. `docs/elaji-planning/ELAJI_DOMAIN_MODEL.md` or a dedicated design note), not code.
- **Backend impact:** None in this sprint.
- **Frontend impact:** None in this sprint.
- **Database/schema impact:** None in this sprint — explicitly deferred until a real Elaji clinic need is confirmed, consistent with the "no speculative schema growth" risk already flagged in `ELAJI_GAP_ANALYSIS.md` §4.
- **Permission/audit impact:** To be designed, not implemented.
- **Tests/checks:** N/A — documentation-only sprint.
- **Acceptance criteria:** A reviewed design note exists answering: per-clinic or per-tenant scope, predefined-toggle vs. custom-field support, historical-data behavior when a field is hidden, and required permissions — ready to become a future implementation sprint if and when a real clinic need confirms it's worth building.

---

## Recommended First Sprint

**Sprint 1 — Financial events on the patient medical timeline.**

Reasons:
- It is the smallest and lowest-risk item in this roadmap: two enum values, two new write call sites inside already-audited billing flows, and a render-side addition to an already-working timeline component. No new endpoints, no new tables, no migration beyond an additive enum change.
- It touches code this session has already verified is correct and stable (`billing.service.ts`'s invoice/payment flows, closed out in the Phase 0E-C29 track) — there is no open uncertainty about *where* to hook in.
- It closes a real, confirmed gap (`ELAJI_GAP_ANALYSIS.md` §1 row 11): the patient timeline currently has comprehensive clinical/operational event coverage but is financially blind, which is an inconsistency worth fixing before building anything bigger on top of the timeline.
- It has no dependency on any open design question — unlike Sprints 3 and 5, which explicitly require a decision (service-request lifecycle shape; clinic-config scope) before work can safely start.
- It is independently valuable regardless of which later sprint gets prioritized next, since several other gaps (service requests, prescriptions) would themselves eventually want timeline visibility too — doing this first makes those additions trivial later instead of needing their own enum/timeline-wiring work.

This sprint has not been implemented. Per standard phase workflow, the next step (if approved) is a dedicated Planning phase for Sprint 1, not direct implementation.

---

## Open questions

- Where exactly is `MedicalTimelineEvent` currently written from (a shared service/helper, or ad hoc per module)? Needs confirmation during Sprint 1 planning before assuming a single hook point.
- Should `MedicalServiceRequest` (Sprint 3) support quantity, or stay strictly one-service-per-request, matching what was actually confirmed in MedPro video 04 (quantity support was explicitly unconfirmed there)?
- Should prescription templates (Sprint 4) be per-doctor or per-organization? Affects schema (`createdByUserId` ownership vs. shared org-level templates).
- Is there a real, named Elaji clinic/specialty driving the need for Sprint 5's field-visibility work, or is it purely speculative at this stage? This should be resolved before Sprint 5 produces its design note, since the answer changes the design's scope significantly.

See `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md` for the full current-state inspection and gap table this roadmap is derived from.
