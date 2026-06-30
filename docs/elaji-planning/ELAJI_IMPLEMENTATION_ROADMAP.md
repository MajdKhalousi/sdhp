# Elaji Implementation Roadmap

**Status:** Active — first 5 sprints drafted, derived from `ELAJI_GAP_ANALYSIS.md`'s gap table and domain model section (first pass, 2026-06-28).

**Update (2026-06-28):** Sprint 1 (timeline financial events) and Sprint 3 (`MedicalServiceRequest`) are both **closed** — see each sprint's entry below for what shipped. Sprint 3 in particular grew well beyond its original "design + schema only" scope into a full feature (execution lifecycle, billing link, patient-profile UI, timeline integration, and a cross-patient work queue) across a sequence of sub-sprints tracked in chat as 2.1–2.5 and 3 — that sub-numbering is session-local bookkeeping, not a renumbering of this document's Sprint 1–5 list.

## Purpose

The actual build roadmap for Elaji Health, derived from `ELAJI_GAP_ANALYSIS.md` decisions. This document is where MedPro-informed research turns into committed, sequenced Elaji work — phases, priority, and scope.

This document does not itself authorize implementation. Per the project's standard phase workflow (`docs/PROJECT_BRAIN.md` → Phase Workflow), each roadmap item still goes through Planning → Approval → Implementation → Diff Review → Commit → Deploy → Verify → Close before any code is written. **Nothing below has been implemented.**

---

## First 5 Implementation Sprints

### Sprint 1 — Financial events on the patient medical timeline

**Status: Closed (2026-06-28).** Shipped as planned, with one course-correction: `MedicalTimelineEvent`/`MedicalTimelineEventType` turned out to be a write-only mechanism never read anywhere in the backend. The actual fix extended the real, rendered timeline path instead — `TimelineEventType` (plain TS enum) and `MedicalTimelineService.getPatientTimeline()`'s derived-on-read fetchers — meaning no schema/migration was needed at all, contrary to this section's original "Database/schema impact" assumption below.

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

**Status: Closed (2026-06-28) — scope grew well beyond this entry.** See the "Sprint 3 — Closure" subsection immediately below for what actually shipped: the UI, billing link, and timeline integration originally deferred here were all completed, plus a cross-patient work queue that wasn't part of the original plan at all.

- **Goal:** Design and, if approved, add a `MedicalServiceRequest` model that tracks a requested service's execution status independently of its payment status — the clearest concrete domain gap identified (`ELAJI_GAP_ANALYSIS.md` §4).
- **Why now:** This is the single largest confirmed structural gap, but it's also the riskiest to rush — it needs its own status-lifecycle design (requested → in progress → completed? or just a boolean?) before any schema work, consistent with this report's own open questions.
- **Files likely affected:** `apps/api/prisma/schema.prisma` (new model), a new `medical-service-requests` module (controller/service/DTOs) if approved, `apps/web/src/components/patients/*` for a future request-list view (deferred to a later sprint — this sprint is schema/backend only).
- **Backend impact:** New model, new module, new endpoints (create/list/update-execution-status), tenant-scoped and patient-scoped per the existing pattern (`assertOwnership`-style guards).
- **Frontend impact:** None in this sprint — deliberately deferred so the data model is validated against real usage before UI investment.
- **Database/schema impact:** New table, new migration — the first non-additive schema change in this roadmap. Needs its own focused planning pass before implementation (per `docs/PROJECT_BRAIN.md` phase workflow).
- **Permission/audit impact:** Needs explicit role-gate decisions (who can request a service, who can mark it executed — likely DOCTOR/NURSE/TECHNICIAN for execution, SECRETARY/ORG_ADMIN for requesting) and audit logging on creation/status changes, consistent with how invoices/payments are already audited.
- **Tests/checks:** New endpoint tests for create/list/status-transition, tenant-isolation test (cross-org access denied), role-gate tests.
- **Acceptance criteria:** A service request can be created against a patient, tracked through an execution status independent of any invoice's payment status, and is fully tenant- and role-scoped — with no UI yet (UI is a follow-on sprint).

#### Sprint 3 — Closure (2026-06-28)

**Status: Closed.** Implemented well beyond the original "schema + backend only" scope above — the original plan's deferred UI/lifecycle/billing-link/timeline work all shipped in the same overall effort, as a sequence of sub-sprints (session-tracked as 2.1–2.5 and 3; not a renumbering of this roadmap).

**1. What was shipped**

| Sub-sprint | Delivered |
|---|---|
| 2.1 | `MedicalServiceRequest` model + `ServiceExecutionStatus` enum (`REQUESTED`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED`), price/name snapshot at request time, create/list/detail endpoints |
| 2.2 | Execute and Cancel lifecycle endpoints (`PATCH :id/execute`, `PATCH :id/cancel`), required `cancelReason` on cancel |
| 2.3 | Billing link — `POST :id/bill`, attaches a request to an existing DRAFT invoice as a billed `InvoiceItem` inside one atomic transaction (no orphan-item risk); `paymentStatus` is always derived live from the linked invoice's status, never stored |
| 2.4 | Patient Profile "Medical Services" tab — request/execute/cancel/bill UI, role-gated actions, reuses existing `ServicePicker`/`useDoctorsList`/`usePatientInvoices` |
| 2.5 | Timeline integration — `SERVICE_REQUESTED`/`SERVICE_EXECUTED`/`SERVICE_CANCELLED` added to the patient timeline, derived-on-read (no new write path, no `MedicalTimelineEvent` rows) |
| 3 | Medical Services Work Queue — cross-patient worklist page (`/dashboard/medical-services-queue`) for staff to manage requests without opening each patient profile; extended the existing list endpoint to support an org/branch-wide mode rather than adding a new endpoint |
| — | Staging deployment verified end-to-end: request → execute → bill-to-draft-invoice → payment status transitions DRAFT→ISSUED live → double-bill rejected → cancelled requests cannot be billed |

No schema changes were needed for 2.2 through 3 — only 2.1 introduced the table/migration; everything after it (execution, billing link, timeline, queue) was additive backend logic and frontend work against that one model.

**2. Current behavior by role**

| Role | Request | Execute | Cancel | Bill | Read (tab/queue) |
|---|---|---|---|---|---|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| ORG_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| DOCTOR | ✅ | ✅ | ✅ | — | ✅ |
| NURSE | — | ✅ | — | — | ✅ |
| SECRETARY | ✅ | — | ✅ | — | ✅ |
| ACCOUNTANT | — | — | — | ✅ | ✅ |
| TECHNICIAN | — | ✅ | — | — | ✅ |

Billing is intentionally **not** available to SECRETARY, matching the pre-existing billing add-item permission policy this feature reuses. The cross-patient Work Queue exposes the same Execute/Cancel actions as the patient-profile tab but deliberately excludes Bill (see Known Limitations).

The Work Queue page itself is reachable by SUPER_ADMIN/ORG_ADMIN/DOCTOR/NURSE/TECHNICIAN/SECRETARY, but **SUPER_ADMIN is omitted from the sidebar nav entry** — consistent with this codebase's existing convention of keeping operational worklists (check-in queue, doctor queue, lab/radiology worklists) out of the platform-operator's sidebar while still allowing direct URL access.

**3. Known limitations**

- **Work Queue status filtering is partly client-side, after pagination.** The backend paginates the org-wide query (`skip`/`take`, default limit 100); the Active/Completed/Cancelled view toggle then filters within whatever page is already loaded, rather than the backend filtering by status before paginating. At single-clinic, today-scoped query volumes this is unlikely to matter, but on a wide date range or high-volume org it could show fewer rows than actually exist on the current page.
- **`doctorId` has no dedicated database index.** The Work Queue's doctor filter works correctly but isn't backed by an index — acceptable at current expected row counts, worth revisiting if doctor-filtered queries become a heavily-used path.
- **Billing remains patient-profile-context only.** The Work Queue intentionally has no Bill action — billing still requires selecting a patient-specific DRAFT invoice (via the existing patient-profile dialog), which the queue does not surface inline. This was a deliberate scope decision (see Sprint 3 planning), not an oversight: building a cross-patient bill flow would have meant fetching each row's patient's invoices on demand, a meaningfully bigger and unproven UI pattern with no existing precedent in this codebase. The Work Queue links out to the patient profile for billing instead.

**4. Recommended next sprint options**

- **Add a dedicated `doctorId` index** on `MedicalServiceRequest` if/when the Work Queue's doctor filter sees real usage — small, low-risk, additive migration.
- **Revisit Work Queue pagination** if a clinic's daily request volume regularly exceeds the default page size — options include raising the default limit, or restructuring to filter-then-paginate server-side (would require the backend to accept the same multi-status filter the queue's view toggle uses today only client-side).
- **Decide whether to bring billing into the Work Queue** once there's a clearer cross-patient invoice-selection pattern elsewhere in the app to reuse — currently deferred, not ruled out.
- Resume the original roadmap's still-open items: **Sprint 4** (prescription templates) and **Sprint 5** (clinic-level field visibility design) below, neither of which has been started.

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

#### Sprint 4 — Closure (2026-06-29)

**Status: Closed.** Shipped scope differs from the original plan above: instead of a doctor saving one of their own existing prescriptions as a template, templates ended up as **clinic-wide, admin-managed catalog entries** (created/edited in Settings, independent of any specific prescription), which doctors then **apply** inside an encounter rather than picking from a "use template" prompt during prescription creation. The underlying goal — turning a repeated medication set into a few clicks instead of retyping — is the same; the ownership/management model is different and, in practice, fits a multi-doctor clinic better than a per-doctor personal template would have.

**1. What was shipped**

| Phase | Delivered |
|---|---|
| C32A | `PrescriptionTemplate` / `PrescriptionTemplateItem` Prisma models (organization-scoped, soft-delete), `prescription-templates` module with full CRUD endpoints; `GET` readable by SUPER_ADMIN/ORG_ADMIN/DOCTOR, writes restricted to SUPER_ADMIN/ORG_ADMIN; DOCTOR is blocked from reading inactive templates via both the list and direct-by-id endpoints |
| C32B | Settings UI for managing templates (`/dashboard/settings/prescription-templates`), reusing the existing inline-expandable-row table pattern, with dynamic add/remove medication rows per template |
| C32C | "Apply Template" inside the Encounter prescription panel — each template item becomes an independent `Prescription` row via the existing single-item create endpoint, called once per item; appends only, never replaces or de-duplicates existing prescriptions; sequential apply with fail-fast partial-failure messaging |
| C34 | Quantity and refills-left, already captured by C32A/C32C, made visible in the live Encounter prescription list (previously fetched but never rendered) |
| C35 | Fixed a text-direction bug in the Patient Profile's prescription card (Timeline / Prescriptions tab) where dosage/frequency/duration were forced into a single `dir="ltr"` string, visually reordering Arabic content — replaced with per-segment bidi isolation |

No bulk-apply backend endpoint was introduced for C32C — applying a template is purely a sequence of calls to the prescription endpoint that already existed.

**2. Current behavior by role**

| Role | Manage templates (Settings) | Read templates | Apply inside Encounter |
|---|---|---|---|
| SUPER_ADMIN | ✅ | ✅ (incl. inactive) | ✅ |
| ORG_ADMIN | ✅ | ✅ (incl. inactive) | ✅ |
| DOCTOR | — | ✅ (active only) | ✅ |

- Templates are **organization-scoped** — no cross-org visibility.
- Templates do **not** store `patientId` or `encounterId` — they are a reusable catalog, not tied to any specific patient or visit.
- Applying a template **appends** new `Prescription` rows; it never replaces or removes existing prescriptions on the encounter.

**3. Known limitations**

- The Patient Timeline / Prescriptions-tab `PrescriptionCard` still does **not** show quantity or refills-left, even for prescriptions created by applying a template. This is because its data source — `PrescriptionEventData`, produced by the medical-timeline projection — never included those fields to begin with, and widening that projection was explicitly out of scope for C32–C35. The live Encounter prescription panel (C34) is the only surface that shows them today.

**4. Recommended next sprint options**

- Widen the medical-timeline `PrescriptionEventData` projection (backend) to include `quantity`/`refillsLeft`, then update `PrescriptionCard` to display them — closes the gap noted above.
- Prescription/PDF or clinical-report polish, if a future need to print/export prescriptions (with or without template provenance) arises.
- Lab/radiology order templates, following the same clinic-wide-catalog pattern established here, if doctors request the same time-saving for those order types.

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

### Sprint 6 — Patient Medical File v2 (narrow improvements)

**Status: Closed (2026-06-29).** Not part of the original 5-sprint plan above — opened, scoped, and closed within the same session, following the Prescription Templates arc (Sprint 4). Conceived as "Clinical Summary + Timeline filters," but planning (C37A) found the Patient Overview tab already covered most of the originally suggested scope (patient metadata, last visit/doctor, upcoming appointment, billing status summary all already existed across four separate existing cards). The shipped scope was deliberately narrowed to the one genuine gap plus one small Timeline UX gap, rather than building a redundant new "v2" surface.

**1. What was shipped**

| Phase | Delivered |
|---|---|
| C37A | Planning pass that found Patient Overview's `PatientHeader`/`PatientVisitStatus`/`PatientClinicalSummary`/`PatientOutstandingBalance` cards already covered nearly all originally-suggested Clinical Summary fields; narrowed scope to the one missing field (last prescription) plus one Timeline filter UX gap (no grouped Billing toggle) |
| C37B | Added a "Last prescription" row to the existing `PatientClinicalSummary` — medication, dosage/frequency/duration when available, no quantity/refills; sourced from the existing tenant-scoped timeline endpoint (`usePatientTimeline(patientId, { types: ['PRESCRIPTION'], limit: 1 })`); hidden entirely (no placeholder) when no prescription exists |
| C37C | Added a grouped "Billing" quick-filter button to the Patient Timeline filters — toggles `INVOICE_ISSUED` and `PAYMENT_RECORDED` together as one click; both individual type filters remain independently usable; no backend change, since both event types already existed |

No backend endpoint, DTO, Prisma migration, or schema change was made anywhere in this sprint — both deliverables are presentation-layer additions over data/endpoints that already existed.

**2. What was deliberately not built**

- **No new Clinical Summary v2 component.** The existing `PatientClinicalSummary` was extended in place; no parallel or duplicate summary surface was created.
- **No `APPOINTMENT` timeline event type.** Appointments are deliberately handled elsewhere (`PatientVisitStatus`'s upcoming-appointment card, the dedicated Appointments tab) — adding them to the medical timeline would be new backend projection work, not a polish pass, and risks duplicating those two existing surfaces. **This remains an open decision, not a rejection** — if a future need makes the case, it requires its own planning pass covering the backend projection change (`PrescriptionEventData`-style new event data shape, a `medical-timeline.service.ts` fetcher, a new card component).
- **No "Notes" timeline filter.** There is no standalone clinical-note entity in this codebase — clinical notes live as fields embedded directly in `Encounter`, already represented by the existing `ENCOUNTER` timeline type. A literal "Notes" filter isn't recommended unless a real, standalone note entity is introduced first; until then, it would filter for a concept that doesn't actually exist as distinct data.

**3. Verified on Staging**

- C37B (commit `7964977`): patient with a prescription shows the row, patient without one hides it cleanly, Arabic/mixed-language text displays acceptably.
- C37C (commit `dad5aea`): Billing quick-filter appears after "All", Arabic label displays correctly, selecting/deselecting it correctly shows/hides invoice and payment events together, date-range filtering continues to work alongside it.

### Sprint 7 — Accounts, Profile, Password, and Permissions Cleanup

**Status: Closed (2026-06-29).** A verification/cleanup arc, not a rebuild — not part of the original 5-sprint plan. Planning (C38A) found that profile management, self-service change-password, and admin staff-account CRUD were **already fully implemented**, both backend and frontend, before this arc started. No new feature was built; the work that followed was documentation verification and an explicit governance decision, not implementation.

**1. What was found already complete (no code changes made)**

- **Profile page** (`apps/web/src/app/[locale]/dashboard/profile/page.tsx`) — already shows name (EN/AR), phone, email, role, organization, branch, active status, last login, sourced from the already-existing `GET /v1/auth/me`.
- **Self-service change password** — already wired end-to-end: `PATCH /v1/auth/me/password` (`auth.service.ts::changePassword`) verifies the current password, rejects mismatched confirmation, rejects reusing the same password, bcrypt-hashes at 12 rounds, writes a `PASSWORD_CHANGED` audit row, and the frontend forces a logout + redirect to `/login` after a successful change.
- **Admin staff-account management** (`apps/web/src/components/settings/staff-table.tsx`, `apps/api/src/modules/users/*`) — already supports create, edit, activate/deactivate, soft-delete, restore, and admin-triggered password reset, with org-scoping, role-assignment restrictions (`ORG_ADMIN` cannot assign/promote to `SUPER_ADMIN`), and last-active-admin protection (can't deactivate/demote/delete the last `SUPER_ADMIN` platform-wide or the last `ORG_ADMIN` in an org).

**2. C38B — Permissions Matrix verification + BRANCH_ADMIN scope decision**

- Independently re-verified `BRANCH_ADMIN`'s footprint via exhaustive grep: full access to Follow-ups, read-only access to 4 reference/settings endpoint groups (`clinic-settings`, `doctor-schedules`, `services`, `visit-types`), nothing else — confirmed to match `Permissions Matrix.md`'s existing claims, no drift found.
- Found and added 3 modules missing from the matrix entirely (`prescription-templates`, `medical-service-requests`, `medical-timeline`) — a documentation lag from the C32 arc, not a code defect.
- Fixed one internally-stale, self-contradicting TODO line in the matrix.
- Recorded an explicit governance decision: **`BRANCH_ADMIN` is intentionally narrow, not equivalent to `ORG_ADMIN`, and must not be broadened silently** — any future expansion requires its own planning phase touching backend `@Roles()` and frontend permission constants together. See `docs/architecture/Permissions Matrix.md`'s "BRANCH_ADMIN Scope Decision" section.

**3. C38C — Audit log coverage verification**

Verified which account/security actions are audited, with no code changes. Covered: self-service password change (`PASSWORD_CHANGED`), admin user creation (`USER_CREATED`), admin user update (`USER_UPDATED`), role changes (`USER_ROLE_CHANGED`, the most fully-instrumented with before/after values), deactivation via the dedicated path (`USER_DEACTIVATED`), reactivation/restore via the dedicated path (`USER_ACTIVATED`), soft-delete (covered by `USER_DEACTIVATED` — deactivation and soft-delete are the same backend operation in this domain model), admin password reset (`PASSWORD_RESET_BY_ADMIN`, never logs the temporary password), and login/logout (`LOGIN`/`LOGOUT`).

**4. Deferred audit gaps (documented, not fixed)**

| Gap | Priority | Reason deferred |
|---|---|---|
| Failed login attempts are not logged | Medium | Forensic/observability gap; partially mitigated by existing login-endpoint rate limiting |
| Generic edit-form `isActive` toggle logs as `USER_UPDATED`, not a distinct `USER_ACTIVATED`/`USER_DEACTIVATED` | Medium | Observability gap only — the underlying access-control guard (last-active-admin protection) is correctly enforced regardless of which path is used |
| `USER_CREATED`/`USER_UPDATED` carry no before/after field snapshot | Low | Functional but thin — actor/target/org/timestamp are always present |
| `ipAddress`/`userAgent` columns exist on `AuditLog` but no call site populates them | Low | General gap, not account-specific; would need a cross-cutting change through every controller |
| `ORG_ADMIN` cannot read its own organization's audit log (`SUPER_ADMIN`-only today) | Informational | An RBAC scope question, not an audit-coverage defect — deliberately left as a separate future decision, not part of this arc |

No central `AuditAction` enum exists — every module uses raw string literals for the `action` field; consistency currently relies on convention, not the type system. Noted as an architectural characteristic, not something fixed in this arc.

**5. Explicit decisions made**

- No audit-code fixes in this arc — the medium/low-priority gaps above are real but non-critical; revisiting them is a separate, explicitly-scoped future phase, not an automatic next step.
- No Redis-backed token revocation — `auth.service.ts::logout()`'s existing comment already documents this as deferred pending Redis integration; still not undertaken.
- No auth/session/token logic changes, no RBAC behavior changes, no new roles, no renamed roles.

---

### Sprint 8 — Reports / Clinic Intelligence v1 (current slice)

**Status: Closed (2026-06-29).** Verified on Staging end-to-end (commit `df79828` confirmed as Staging HEAD, web container healthy, logs clean). This slice consumed two endpoints that already existed on the backend (`reports.controller.ts`/`reports.service.ts` already had six: `summary`, `appointments`, `clinical`, `queue`, `billing`, `cashier-summary`) — only `summary` and `appointments` got frontend pages and one small backend fix in this slice. `clinical`, `queue`, and deeper analytics remain backend-only, deliberately deferred (see below).

**1. What shipped**

| Phase | Commit | What |
|---|---|---|
| C39B | `d3e59b8` | Backend-only: `/v1/reports/summary`'s `patients.total`/`patients.active` counts now respect the requested `from`/`to` period, matching the same `createdAtFilter` pattern every other metric in that endpoint already used. No endpoint, DTO, or response-shape change. |
| C39C | `e38e9de` | Added `/dashboard/reports/summary`, a new frontend page consuming the existing `GET /v1/reports/summary`. |
| C39D | `81a19a4` | Added `/dashboard/reports/appointments`, a new frontend page consuming the existing `GET /v1/reports/appointments`. |
| C39D-Polish | `83e77d6` | UX fix: removed appointment-specific duplication (Appointments Total card, Appointments by Status panel) from Reports Summary once Appointment Reports existed as the dedicated detail page. |
| C39E | `df79828` | Consolidated the sidebar to a single "Reports"/"التقارير" entry; added local in-page tabs ("Summary"/"ملخص" and "Appointments"/"المواعيد") so the two routes are reachable without separate sidebar clutter. |

**2. Current behavior**

- **Reports Summary** (`/dashboard/reports/summary`) is now a high-level, cross-domain operational overview: Staff total, Patients total, Active patients, Appointments today, Appointments upcoming, Encounters total, Prescriptions total, Queue total, plus a Queue by Status breakdown. It deliberately does **not** show detailed appointment-status breakdowns anymore — that's Appointment Reports' job.
- **Appointment Reports** (`/dashboard/reports/appointments`) is the detailed, appointment-focused page: total, today, upcoming, completed, cancelled, noShow, and an Appointments by Status breakdown using the existing `appointment.status.*` i18n labels.
- Both pages share the same date-preset pattern (today / last 7 days / last 30 days / custom) and the same role guard.
- The sidebar shows exactly one "Reports" item (under the medical-work group); it stays highlighted while on either route. A shared `ReportsTabs` component (`apps/web/src/components/reports/reports-tabs.tsx`) provides local navigation between the two pages once inside the Reports area.
- **Billing Reports** (`/dashboard/reports/billing`) is unrelated to this slice — separate route, separate sidebar entry under billing/cashier, separate role set (`ORG_ADMIN`, `ACCOUNTANT`), untouched throughout C39B–E.

**3. Permissions/RBAC — unchanged**

- Backend `@Roles()` for `GET /reports/summary` and `GET /reports/appointments` were not touched: both remain `SUPER_ADMIN, ORG_ADMIN, DOCTOR`.
- Frontend page-level access (`REPORTS_SUMMARY_ACCESS_ROLES`, `REPORTS_APPOINTMENTS_ACCESS_ROLES` in `apps/web/src/lib/permissions.ts`) matches the backend role set exactly on both pages.
- `BRANCH_ADMIN` was not added to either page or to the sidebar.
- The single sidebar nav entry follows the existing clinic-nav convention of excluding `SUPER_ADMIN` (same pattern already used by Billing Reports and Doctor Workspace) — this is a pre-existing convention, not new in this slice, and does not affect the page-level guard, which still allows `SUPER_ADMIN` on direct URL access.

**4. Explicitly deferred (not started)**

- Clinical Reports page (backend `GET /reports/clinical` exists, unconsumed by any frontend page).
- Queue Reports page (backend `GET /reports/queue` exists, unconsumed).
- Top doctors by completed visits — no existing data path supports this; would need new aggregation.
- Service/category summary — same reason, no existing data path.
- Export / report-builder of any kind.
- A full BI / custom report builder.
- Any backend RBAC broadening — no role was added or widened anywhere in this slice.

---

### Sprint 9 — Visit Reports (Clinical) inside the Reports Hub

**Status: Closed (2026-06-29).** Verified on Staging (commit `42ef2b0` confirmed as Staging HEAD, web container healthy, logs clean, page loads visually, Arabic/RTL acceptable, date filters work). Adds a third page to the Reports Hub established in Sprint 8, consuming an endpoint that already existed on the backend (`GET /v1/reports/clinical`) — no backend change.

**1. What shipped**

| Phase | Commit | What |
|---|---|---|
| C40A | — (planning only) | Confirmed `GET /v1/reports/clinical`'s exact response shape and `@Roles(SUPER_ADMIN, ORG_ADMIN, DOCTOR)`; decided on route `/dashboard/reports/clinical` with user-facing label "Visit Reports"/"تقارير الزيارات" (the product already uses "Visit" as its clinic-facing term, reserving "Encounter" for backend/data-model usage); decided to add a third local tab rather than a fourth sidebar item. |
| C40B | `42ef2b0` | Added the Visit Reports page, a `useClinicalReport` hook, a third `ReportsTabs` entry ("Visits"/"الزيارات"), and a `REPORTS_CLINICAL_ACCESS_ROLES` permission constant. Extended the sidebar's existing 3-way active-state check (already covering summary/appointments) to a 3-way check covering summary/appointments/clinical — still excluding `/dashboard/reports/billing` by exact match, not prefix match. |

**2. Current behavior**

- **Visit Reports** (`/dashboard/reports/clinical`) shows exactly 6 cards, each a direct field from the existing response: Total Visits, Visits with Diagnosis, Visits with Treatment Plan, Visits without Diagnosis, Total Prescriptions, Prescriptions with Refills. No breakdown table (the response has no `byStatus`-style map) and no computed percentages or derived KPIs.
- The Reports Hub now has three local tabs: Summary / ملخص, Appointments / المواعيد, Visits / الزيارات.
- The sidebar still shows exactly one "Reports" entry; it's active on all three hub routes but **not** on `/dashboard/reports/billing`, which remains its own separate, untouched sidebar item and page.

**3. Permissions/RBAC — unchanged**

- Backend `@Roles()` for `GET /reports/clinical` was not touched: `SUPER_ADMIN, ORG_ADMIN, DOCTOR`.
- `REPORTS_CLINICAL_ACCESS_ROLES` in `apps/web/src/lib/permissions.ts` matches that exactly.
- `BRANCH_ADMIN` was not added anywhere in this slice.
- No new sidebar nav-role constant was introduced — the hub's existing `NAV_REPORTS_SUMMARY_ROLES` (`ORG_ADMIN, DOCTOR`) continues to gate the single entry.

**4. Documented existing characteristic (not changed)**

`GET /v1/reports/clinical`'s encounter counts are branch-scoped when `branchId` is provided (Encounter has its own `branchId` column), but its prescription counts are organization-scoped only — the nested `encounter: { organizationId, ... }` filter inside `rxWhere` never adds `branchId`, even though the related Encounter has one. This was identified during C40A planning and treated as a documented characteristic, consistent with how Patient counts in `/reports/summary` are similarly org-only — not a bug fixed in this slice.

**5. Explicitly deferred**

- Trimming Reports Summary's "Encounters Total"/"Prescriptions Total" cards, which now duplicate two of Visit Reports' six metrics — intentionally left for a possible future polish phase, decided only after the new page was visible, the same way C39D-Polish followed C39D rather than being bundled into the initial build.
- Any breakdown/table view for clinical/visit data.
- Percentages or computed KPIs (e.g., a diagnosis-completion rate).
- Top doctors by completed visits, service/category summary, export/report-builder, full BI/custom report builder.
- Changing prescription counts to be branch-scoped — would require a backend change, out of scope for a frontend-only slice.

---

### Sprint 10 — Reports Hub UX / Information Architecture Polish

**Status: Closed (2026-06-29).** Verified on Staging (commit `444ecd1` confirmed as Staging HEAD, web rebuild/restart succeeded, Summary visually shows 6 cards + Queue by Status only, Appointment Reports and Visit Reports both still work, Arabic/RTL acceptable). A UX/IA review of the Reports Hub built across Sprints 8–9, not a new feature.

**1. What shipped**

| Phase | Commit | What |
|---|---|---|
| C41A | — (planning only) | Reviewed the Reports Hub's information architecture and found Reports Summary duplicating two exact metrics ("Encounters Total"/"Prescriptions Total") already owned by Visit Reports. Decided Summary should stay a lightweight, cross-domain front door rather than a second copy of any detailed tab. Also evaluated and explicitly deferred Queue Reports (because `/reports/queue` returns nothing Summary doesn't already surface) and a Billing-Reports-into-the-hub migration (different audience/role model, no stated need). |
| C41B | `444ecd1` | Removed exactly the two duplicate cards from Reports Summary. No hook, API, permissions, sidebar, or `ReportsTabs` changes — a pure render-layer trim. |

**2. Current Reports Hub structure**

- **Summary / ملخص** — lightweight cross-domain overview. Shows: Staff total, Patients total, Active patients, Appointments today, Appointments upcoming, Queue total, plus a Queue by Status breakdown. Intentionally no longer shows Encounters/Visits Total or Prescriptions Total — those totals are owned by Visit Reports and were exact duplicates with no added value on Summary.
- **Appointments / المواعيد** — unchanged, remains the detailed appointment report (total/today/upcoming/completed/cancelled/noShow + Appointments by Status).
- **Visits / الزيارات** — unchanged, remains the detailed visit/prescription activity report (6 cards: Total Visits, Visits with Diagnosis, Visits with Treatment Plan, Visits without Diagnosis, Total Prescriptions, Prescriptions with Refills).
- **Billing Reports** — remains separate, under Billing/Cashier, unaffected by this slice; serves a different primary audience (`ORG_ADMIN, ACCOUNTANT`) than the Reports Hub's nav convention (`ORG_ADMIN, DOCTOR`).

**3. Rationale**

Summary's two removed cards were exact-value duplicates of Visit Reports' totals for the same period — unlike Appointments Today/Upcoming, which remain on Summary deliberately as "right now" cross-domain signals distinct in purpose from Appointment Reports' full period breakdown. The dividing line going forward: Summary keeps metrics with no detailed-tab home, or genuine at-a-glance/current-state value; detailed tabs own their domain's full totals and breakdowns.

**4. Permissions/RBAC — unchanged**

No backend, API, or RBAC files were touched in C41A or C41B. No new or modified permission constant — `REPORTS_SUMMARY_ACCESS_ROLES`, `REPORTS_APPOINTMENTS_ACCESS_ROLES`, and `REPORTS_CLINICAL_ACCESS_ROLES` are all exactly as documented after Sprint 9.

**5. Explicitly deferred**

- Queue Reports as a separate tab — `/reports/queue` would add nothing Summary doesn't already show; revisit only if a real future need (e.g. branch-level queue trend, which the endpoint doesn't even support yet) emerges.
- Migrating Billing Reports into the Reports Hub — different audience and role model, no concrete justification found.
- Clinical/visit breakdowns beyond the existing 6 direct-field cards.
- Percentages or computed KPIs.
- Top doctors by completed visits, service/category summary, export/report-builder, full BI/custom report builder.
- Any RBAC broadening.

---

### Sprint 11 — Cashier/Billing Operational Polish

**Status: Closed (2026-06-30).** A safety/UX review of the cashier and billing flow ahead of first real clinic trial usage, not a redesign. Planning found the flow already well-guarded; the only concrete gap was English-only backend error text reaching Arabic cashier sessions.

**1. What shipped**

| Phase | Commit | What |
|---|---|---|
| C42A | — (planning only) | Reviewed the full invoice lifecycle (DRAFT → ISSUED → PARTIALLY_PAID → PAID, with CANCELLED as a terminal off-ramp from DRAFT/ISSUED-unpaid only) and the Cashier Today/Outstanding action set against it. Confirmed zero-amount/zero-remaining handling, overpayment limits, and cancel/void exposure are all already correctly guarded — cancel and void are deliberately absent from Cashier Today and only reachable on the invoice detail page, which is itself role-restricted below SECRETARY. Confirmed tenant isolation (`assertOrgAccess`, `assertClinicalInvoiceAccess`) and RBAC alignment between backend `@Roles()` and frontend permission constants, with one exception noted below. Confirmed all six billing mutations are audit-logged. Recommended the smallest fix that mattered for clinic-trial safety: friendly, localized error text for the handful of cashier-triggerable `BadRequestException` messages. |
| C42B | `031006e` | Added a small matcher table to `getFriendlyApiErrorMessage` mapping five exact (one prefix-matched, for a dynamic amount) backend billing error strings to a new top-level `billing.errors.*` i18n namespace, in both locales. No backend, billing-logic, RBAC, or tolerance changes — purely a display-text lookup, verified to not collide with any other domain's error strings sharing the same helper. |

**2. Current cashier/billing safety status**

- Invoice/payment lifecycle and action visibility matrix reviewed end-to-end; no ungated state or action found.
- Zero-amount, zero-remaining, and overpayment are all guarded in both the UI and the backend (backend is authoritative via DTO validation and service-level checks).
- Cancel and void remain detail-page-only, not exposed in Cashier Today — unchanged, confirmed still the case after C42B.
- Tenant isolation and RBAC reviewed and found correct, with SECRETARY deliberately narrower than ACCOUNTANT for edit/cancel/void/analytics actions.
- All six billing mutations (`INVOICE_CREATED`, `INVOICE_ISSUED`, `INVOICE_CANCELLED`, `INVOICE_SETTLED_NO_CHARGE`, `PAYMENT_CREATED`, `PAYMENT_VOIDED`) are audit-logged.
- Cashier-facing billing errors for the cases above are now localized and friendly instead of raw backend exception text.

**3. Staging verification — with an accuracy note**

The Arabic overpayment scenario tested on staging (entering 140 against a 135 remaining balance) showed `"المبلغ يتجاوز الرصيد المتبقي."` — this is the **pre-existing** client-side validation message (`invoice.payment.validation.amountExceedsRemaining`), which fires before the request ever reaches the backend. It confirms the cashier-facing Arabic experience is friendly for the most common real-world overpayment path, but it did **not** independently exercise C42B's new backend-error-mapping keys (`billing.errors.*`), since the client-side guard intercepted first. Those new keys only activate when a request actually reaches the backend and is rejected — e.g. a stale remaining-balance value, or any of the other four mapped messages (empty-invoice, no-charge-on-nonzero-total, wrong invoice state, zero-remaining). This distinction is recorded here rather than overstated, consistent with this project's source-of-truth discipline.

**4. No runtime/backend changes**

No backend billing logic, invoice/payment state, RBAC, or payment-amount tolerance was changed anywhere in C42A or C42B.

**5. Explicitly deferred**

- Aligning the frontend's `+0.001` payment-amount tolerance with the backend's strict check.
- Whether to add NURSE to `INVOICE_READ_ROLES` on the frontend (backend already permits NURSE reads — this is a capability gap in the safe direction, not a security issue, and needs its own explicit decision).
- Refactoring `RecordPaymentForm` vs `IssueAndPayDialog`'s duplicated form logic.
- Exposing cancel/void in Cashier Today.
- Any new invoice/payment states.
- Billing Reports redesign.
- Full accounting/inventory/finance features.

---

### Sprint 12 — Patient Creation Quality / First Clinic Trial Readiness

**Status: Closed (2026-06-30).** Grew out of the C43A First Clinic Trial Readiness Audit, which flagged patient registration as the one module with a concrete, real data-quality gap (duplicate-phone-within-org not enforced) ahead of a real clinic trial. This slice closed that gap and two related findings discovered along the way, all staging-verified.

**What shipped**

| Phase | Commit | What |
|---|---|---|
| C43B | `3def3d1` | Fixed a stale-acknowledgement bug in the duplicate-patient soft warning: editing the phone field after a duplicate warning was shown previously left the old "Create Anyway" acknowledgement pointing at the un-edited value. Now any phone edit while the warning is showing resets it, forcing a fresh check on the next submit. |
| C43B-Polish | `0469da2` | Found and fixed a deeper regression this surfaced: the "Create Anyway" button was hidden entirely whenever the matched duplicate was already linked to the org — true for nearly every real duplicate-phone case — making the soft warning behave like a hard block in practice. The button now always renders; the "already linked" note is additional advisory text, not a replacement for the escape hatch. The bottom form submit button is now also disabled while the warning is pending, closing a redundant-resubmit path. |
| C43B-Polish-2 | `6e0d80f` | Added a second, independent soft confirmation: if required fields pass but an entire optional section (family info, additional info, medical info, or emergency contact) is left blank, a "missing information" warning lists the blank sections and offers "Complete information" or "Create Anyway." Sequenced strictly after the duplicate-warning gate clears, with its own independent stale-payload reset (any field edit invalidates it) that doesn't interfere with the duplicate warning's narrower phone-only reset. |
| C43C | `edabc68` | Removed a non-functional "Allergies" textarea from the patient create/edit form, discovered while building C43B-Polish-2's medical-section check. The field was collected in local form state but never included in the create/update payload — a silent clinical-data-loss risk, since staff could type an allergy and reasonably assume it was saved. The real, structured allergy feature (`Allergy[]` model, full backend CRUD, `AllergiesCard` on the patient profile) was confirmed completely separate and untouched. |

**Current behavior**

Creating a patient now runs two independent, sequential soft gates before the API call: a duplicate-phone/name/DOB/nationalId check (existing, now fixed), then a missing-optional-section check (new). Both are dismissible, both require an explicit "create anyway" click to proceed past, and neither blocks creation outright — consistent with this slice's explicit non-negotiable: legitimate edge cases (shared-household phone numbers, genuinely sparse patient records at registration time) must remain creatable. The Allergies textarea — which never did anything — is gone from both create and edit forms; Chronic Diseases remains, unaffected.

**Staging verification**

All of the following were visually confirmed on staging: duplicate warning appears before creating a likely-duplicate patient, with existing-patient context (name, MRN, phone, DOB) and three clear actions (view existing, cancel, create anyway); the bottom form button cannot bypass it; editing the phone clears it. The missing-information warning appears only after the duplicate gate clears, lists blank sections correctly, and offers complete-or-continue. The Allergies textarea is gone from both create and edit forms; Chronic Diseases still saves and displays correctly; an existing real allergy record still appears correctly in patient safety alerts and the Known Allergies card on the patient profile, confirming the dead-field removal didn't touch the real feature.

**Safety/UX rationale**

Every change in this slice follows the same principle established back in C43A: a first clinic trial needs friction against *accidental* mistakes (duplicate records, sparse records, a field that silently eats clinical input) without ever blocking a legitimate edge case outright. Two soft, dismissible, sequenced confirmations plus removing one misleading dead field accomplish that without introducing any new required field, any backend validation, or any hard constraint.

**No backend/schema/RBAC changes**

C43B, C43B-Polish, C43B-Polish-2, and C43C are all frontend-only. No Prisma schema, migration, backend service/controller, DTO, or permissions/RBAC file was touched in any of the four phases — confirmed in each phase's diff review before commit.

**Explicitly deferred**

- A real Add/Edit Allergy UI using the existing, already-built `Allergy[]` backend CRUD (`/v1/patients/:patientId/allergies`) — the backend fully supports this today; only a frontend write path is missing. Identified as a genuine, separately-scoped feature gap during C43C planning, not a small fix.
- Cancel Encounter — the encounter-lifecycle gap identified in the original C43A audit (no graceful cancel path for a mis-started encounter, distinct from hard delete).
- Carried over from C42: frontend/backend payment-tolerance alignment, NURSE invoice-read frontend permission decision, `RecordPaymentForm`/`IssueAndPayDialog` refactor, invoice `update`/`addItem`/`removeItem` audit-log coverage.
- Carried over from C43A: RTL bidi polish on free-text clinical fields, ACCOUNTANT/DOCTOR nav-visibility UX cleanups, dead non-localized queue route cleanup.

---

### Sprint 13 — Cancel Encounter / Abandon Visit

**Status: Closed (2026-06-30).** Closed the encounter-lifecycle gap first identified in the C43A First Clinic Trial Readiness Audit and explicitly deferred at the end of Sprint 12: a doctor had no graceful way to abandon a mistakenly-started visit other than completing it with empty fields or asking an ORG_ADMIN to use the generic delete endpoint (which DOCTOR couldn't access at all). Backend and frontend both staging-verified.

**What shipped**

| Phase | Commit | What |
|---|---|---|
| C44B | `78b0009` | New `PATCH /v1/encounters/:id/cancel` endpoint (`SUPER_ADMIN`/`ORG_ADMIN`/`DOCTOR`, DOCTOR restricted to their own encounter). Adds one nullable `cancelReason` column via a minimal migration. Reuses the existing soft-delete mechanism (`deletedAt`) rather than a new status field or state machine — confirmed during planning that Visit Reports and the patient timeline already exclude `deletedAt`-set encounters, so no reports/timeline code needed to change. Rejects with a clear error if the encounter is already completed (`endedAt` set) or already cancelled/deleted. Writes an audit log (`action: 'CANCEL'`) — the first audited mutation on `Encounter` in this codebase, since `create()`/the existing `remove()` write none. Deliberately writes no patient-facing medical-timeline event, after confirming the timeline-writer's underlying table isn't read by the patient-facing timeline endpoint at all. Transactionally reverts a linked appointment from `IN_PROGRESS` to `CANCELLED` and its queue entry from `IN_PROGRESS` to `SKIPPED`, only when each was in that exact active state. |
| C44C | `2cad105` | New "Cancel Visit"/"إلغاء الزيارة" action in the doctor encounter workspace, alongside the existing "Complete Visit" button but with clearly lower visual weight (muted outline vs. green-filled). Confirmation dialog with an optional reason textarea, full Arabic/English copy. A dirty-state visibility bug — copying `EndEncounterButton`'s `(!isDirty || pendingComplete)` condition, which would have hidden Cancel whenever the form had unsaved edits — was caught during diff review and fixed before commit; visibility is `canEdit && !isEnded` only, independent of the form's dirty state. Redirects to `/dashboard/doctor/queue` on success, matching the existing completion flow. |

**Current behavior**

A doctor can now safely abandon an active, not-yet-completed visit at any point — including with unsaved edits in the form — without it ever being counted as a completed visit or appearing in the patient's clinical history. The action is reachable for SUPER_ADMIN/ORG_ADMIN/DOCTOR (DOCTOR limited to their own encounters), invisible to NURSE/SECRETARY, and disappears entirely once a visit is completed. A linked appointment/queue entry that was actively in progress is automatically cleaned up to reflect the abandoned visit rather than being left stuck "in progress" indefinitely.

**Staging verification**

Full end-to-end verification was performed on staging, not just unit-level: Cancel Visit appears and remains visible with unsaved edits; the confirmation dialog (Arabic and English) appears before any API call; an optional reason textarea works; "Keep Visit" dismisses cleanly; a successful cancel shows the Arabic success toast and redirects; the cancelled encounter's database row has `deletedAt` set and `cancelReason` correctly `NULL` when no reason was given; an audit log row exists with `action = CANCEL`, `resource = encounter`; a real linked appointment (`seed-appt-026`) transitioned to `CANCELLED` and its queue entry to `SKIPPED`; Appointment Reports' cancelled count incremented by one after the test, confirming the propagation is visible end-to-end through an existing, unmodified read path. API health and the web build/restart were both confirmed OK after their respective deploys.

**No backend/RBAC surprises**

The new endpoint's role list (`SUPER_ADMIN`/`ORG_ADMIN`/`DOCTOR`) exactly matches the existing `Encounters POST / PATCH` row in the Permissions Matrix — DOCTOR's ownership restriction mirrors `update()`'s pre-existing pattern verbatim, not a new RBAC concept. The Permissions Matrix gained one new row for this endpoint (see below); no existing role or endpoint's access changed.

**Explicitly deferred**

- Localized/friendly mapping for the two backend cancel rejection messages (already-completed, already-cancelled) — same class of gap C42B addressed for billing, not yet extended here.
- Any patient-facing "this visit was cancelled" timeline marker — the audit log is the system of record for this; the patient timeline silently excludes cancelled encounters today, by deliberate choice during C44A/C44B planning.
- A broader `EncounterStatus` enum or state machine — explicitly ruled out as out of scope for this slice.
- A frontend UI for an admin to cancel a different user's in-progress encounter outside the doctor's own workspace — no such route currently exists naturally; not built speculatively.
- Audit-log coverage for `create()`/`remove()` on `Encounter`, which still write none — noted as a related, smaller gap, not addressed in this slice.

### Sprint 14 — Primary server update / operational verification (C41–C44 deploy)

**Status: Closed (2026-06-30).** Not a feature sprint — brings the primary server fully current after it had drifted 65 commits behind master, and verifies the deploy mechanically and via manual smoke test before any real clinic data consideration proceeds. Documentation-only phase; no app code changed as part of C45C itself.

**What happened**

The host with hostname `sdhp-staging` — which, per the Environment-Registry naming warning, actually runs the production domain and `docker/docker-compose.prod.yml` stack (containers `sdhp_api`, `sdhp_web`, `sdhp_postgres`, `sdhp_nginx`; images `sdhp_prod-api`, `sdhp_prod-web`) — was updated from 65 commits behind to current `master` (`ed2a85d`), bringing it through everything from Sprint 11 (Cashier/Billing Operational Polish) through Sprint 13 (Cancel Encounter / Abandon Visit).

**Backup evidence**

- Pre-update manual Postgres backup created and verified before any change was made.
- Post-update manual Postgres backup created and verified: `/var/backups/sdhp/manual/post-master-update-20260630-111621.pgdump`.

**Migration verification**

- `apps/api` and `apps/web` builds both succeeded.
- Prisma migrations applied successfully, including C44B's hand-written `20260630120000_add_encounter_cancel_reason` migration (created without local `migrate dev` access per that phase's explicit DB-access constraint — this is its first real-database application).
- No unresolved Prisma migrations remain.

**Health verification**

- API and Web containers both healthy after restart.
- API health endpoint returns `ok`.
- `git status` on the server is clean and synced with `origin/master` at `ed2a85d`.
- Disk usage after update: 24% — safe.

**Manual UI smoke-test checklist**

| Check | Result |
|---|---|
| Patient creation | ✅ Works |
| Missing optional information warning (Sprint 12 / C43B-Polish-2) | ✅ Works |
| Duplicate-patient warning + explicit "Create Anyway" (Sprint 12 / C43B-Polish) | ✅ Works |
| Old non-functional Allergies textarea (Sprint 12 / C43C) | ✅ Confirmed removed |
| Existing structured `AllergiesCard` | ✅ Unaffected |
| Cancel Visit from doctor workspace (Sprint 13 / C44C) | ✅ Works |
| Billing/cashier guards (Sprint 11) | ✅ Still work |
| Medical service / prescription-template pages | ✅ Open without crash |

**No app-code blocker from the C41–C44 update.** Every sprint shipped between the prior deploy and `ed2a85d` is now live, mechanically verified (build, migrate, health) and manually smoke-tested across its own acceptance criteria. The update itself surfaced no regression and required no follow-up code fix.

**Remaining operational decision — not resolved in this phase**

The primary server's demo/internal data, already documented in Environment-Registry.md ("currently demo/internal data only") and re-confirmed by the C45A/C45B readiness audits, is still present. Before any real patient data is entered, an explicit decision is needed on one of:
1. Clean the existing demo/internal data from this organization,
2. Isolate real data by creating a new organization/tenant alongside the existing demo one, or
3. Create a fresh real-clinic organization and accounts and leave the demo org as-is, unused.

This decision belongs to the project owner (see C45B's "Decisions needed from owner") and is explicitly **not** made or assumed by this documentation phase.

---

## Recommended First Sprint

**Sprint 1 — Financial events on the patient medical timeline.**

Reasons:
- It is the smallest and lowest-risk item in this roadmap: two enum values, two new write call sites inside already-audited billing flows, and a render-side addition to an already-working timeline component. No new endpoints, no new tables, no migration beyond an additive enum change.
- It touches code this session has already verified is correct and stable (`billing.service.ts`'s invoice/payment flows, closed out in the Phase 0E-C29 track) — there is no open uncertainty about *where* to hook in.
- It closes a real, confirmed gap (`ELAJI_GAP_ANALYSIS.md` §1 row 11): the patient timeline currently has comprehensive clinical/operational event coverage but is financially blind, which is an inconsistency worth fixing before building anything bigger on top of the timeline.
- It has no dependency on any open design question — unlike Sprints 3 and 5, which explicitly require a decision (service-request lifecycle shape; clinic-config scope) before work can safely start.
- It is independently valuable regardless of which later sprint gets prioritized next, since several other gaps (service requests, prescriptions) would themselves eventually want timeline visibility too — doing this first makes those additions trivial later instead of needing their own enum/timeline-wiring work.

**Status: Closed (2026-06-28).** This reasoning is preserved as the historical record of why Sprint 1 was picked first; the actual implementation note lives with Sprint 1's entry above. Note that the implementation found `MedicalTimelineEvent` to be a write-only, never-read mechanism — the real fix extended the actually-rendered `TimelineEventType`/`MedicalTimelineService` path instead, not the one assumed in this section's original reasoning.

---

## Open questions

- Where exactly is `MedicalTimelineEvent` currently written from (a shared service/helper, or ad hoc per module)? Needs confirmation during Sprint 1 planning before assuming a single hook point.
- Should `MedicalServiceRequest` (Sprint 3) support quantity, or stay strictly one-service-per-request, matching what was actually confirmed in MedPro video 04 (quantity support was explicitly unconfirmed there)?
- Should prescription templates (Sprint 4) be per-doctor or per-organization? Affects schema (`createdByUserId` ownership vs. shared org-level templates).
- Is there a real, named Elaji clinic/specialty driving the need for Sprint 5's field-visibility work, or is it purely speculative at this stage? This should be resolved before Sprint 5 produces its design note, since the answer changes the design's scope significantly.

See `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md` for the full current-state inspection and gap table this roadmap is derived from.
