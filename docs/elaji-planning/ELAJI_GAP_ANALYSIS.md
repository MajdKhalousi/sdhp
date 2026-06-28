# Elaji Gap Analysis

**Status:** Active — first pass complete, based on direct repository inspection (Prisma schema, backend services/controllers, frontend components/hooks) cross-referenced against `docs/product-research/medpro-reference/videos/01` through `06`.

## Purpose

The bridge document between MedPro reference research (`docs/product-research/medpro-reference/`) and Elaji's actual roadmap (`ELAJI_IMPLEMENTATION_ROADMAP.md`). For each MedPro capability documented in the reference research, this document records:

- Does Elaji already have this? (Yes / Partial / No)
- If not, should Elaji build it? (Yes / No / Defer) — and why.
- Any difference in how Elaji should approach it vs. how MedPro does it.

This document makes Elaji-specific decisions. It is not a description of MedPro — see `docs/product-research/medpro-reference/` for that. Every claim below about Elaji's *current* state is grounded in a direct read of the named file(s) — not assumption. Where something could not be directly confirmed in this pass, it is marked **needs inspection** rather than guessed.

**Source MedPro notes used:** `01-reservation-patient-flow.md`, `02-visit-types.md`, `03-medical-service-types.md`, `04-patient-file-medical-service-requests.md`, `05-patient-registration.md`, `06-clinic-patient-file-field-settings.md`.

---

## 1. Current Elaji State

| # | Focus area | Status | Evidence |
|---|---|---|---|
| 1 | Patient registration and patient profile | **Implemented** | `Patient` model (`schema.prisma:657`), `patients.controller.ts`/`patients.service.ts`, `CreatePatientDto` — comprehensive bilingual demographics, MRN, allergies relation, **duplicate-check endpoint already exists** (`GET /patients/check-duplicate`). |
| 2 | Patient file as central workspace | **Implemented (substantially)** | `apps/web/src/app/[locale]/dashboard/patients/[id]/page.tsx` — tabbed view: Overview, Appointments, Follow-ups (conditional), Timeline, Prescriptions, Labs, Radiology, Files, Reports, Invoices. Closely mirrors MedPro's tabbed patient file pattern. |
| 3 | Appointments | **Implemented** | `Appointment` model + full CRUD/status lifecycle (`AppointmentStatus` enum: 8 states), extensively exercised this session (Phase 0E-C29 track). |
| 4 | Visits | **Partially implemented — naming/model split** | MedPro's "Visit" (with clinical detail: chief complaint, diagnosis, notes) maps to Elaji's **`Encounter`** model, not a "Visit" model. Encounter has matching clinical fields (`chiefComplaint`, `diagnosis`, `treatmentPlan`, `notes`). What's unclear: whether the patient file's "Appointments" tab also surfaces Encounter clinical detail inline (MedPro's expandable-row pattern) — **needs inspection**. |
| 5 | Queue / waiting room | **Implemented** | `QueueEntry` model + `queue.service.ts`/`queue.controller.ts`, full check-in → ticket → status lifecycle, extensively built and verified this session (Phase 0E-C29). |
| 6 | Visit types | **Implemented — different shape than MedPro** | `VisitType` model exists, but `code` is a **fixed enum** (`VisitTypeCode`: CONSULTATION/FOLLOW_UP/EMERGENCY/PROCEDURE/FREE_VISIT) with `@@unique([organizationId, code])` — only one VisitType per code per org. MedPro's visit types are free-form, admin-creatable rows with no such ceiling. No insurance-code field on Elaji's `VisitType`. |
| 7 | Medical services catalog | **Implemented — narrower than MedPro** | `Service` model exists (free-text `code`, `defaultPrice`, `departmentId`, `isActive`). Missing vs. MedPro's catalog (video 03): no insurance code, no variable-price flag, no multi-session flag/session count. |
| 8 | Medical service requests | **Closed (2026-06-28)** — was "Missing as a distinct concept" | `MedicalServiceRequest` now exists with a full lifecycle (request → execute/cancel → bill), live-derived payment status, a patient-profile tab, timeline integration, and a cross-patient work queue. See `ELAJI_IMPLEMENTATION_ROADMAP.md`'s Sprint 3 closure for full detail. Original gap description preserved below for history: no separate request date, requested-by, doctor, or **execution status** field independent of payment status existed — Elaji had no equivalent to MedPro's "Executed?" field (video 04). |
| 9 | Payment requests / remaining payments | **Implemented — different entity, same behavior** | No separate `PaymentRequest` entity, but `Invoice` (`totalAmount`/`paidAmount`, with `remaining = total - paid` computed in UI) serves the identical role MedPro's Payment Requests page serves. Functionally equivalent, just a different name/shape — not a gap. |
| 10 | Prescriptions | **Implemented — narrower than MedPro** | `Prescription` model exists, linked to `Encounter` (medication, dosage, frequency, duration, instructions, quantity, refillsLeft). Missing vs. MedPro (video 04): no "save as template" / reusable prescription templates, no explicit print flow confirmed in schema (print is a UI/PDF concern, not necessarily a gap). |
| 11 | Medical timeline | **Implemented — already mature** | `MedicalTimelineEvent` model with a comprehensive `MedicalTimelineEventType` enum already covering: PATIENT_CREATED/UPDATED/ARCHIVED, APPOINTMENT_BOOKED, FOLLOW_UP_BOOKED, CHECKED_IN, QUEUE_JOINED, ENCOUNTER_STARTED/COMPLETED, PRESCRIPTION_ADDED, LAB_ORDERED/RESULT_ADDED, RADIOLOGY_ORDERED/REPORT_ADDED, MEDICAL_FILE_UPLOADED, CLINICAL_REPORT_CREATED. **Gap:** no invoice/payment-related event types (no `INVOICE_ISSUED`, `PAYMENT_RECORDED`) — financial activity is invisible on the patient timeline today. |
| 12 | Billing / invoices / payments | **Implemented — already mature** | `Invoice`/`InvoiceItem`/`Payment`/`BillingPolicy` models, full lifecycle (DRAFT→ISSUED→PARTIALLY_PAID→PAID, plus CANCELLED), `AppointmentPaymentPolicy` (NONE/OPTIONAL_PREPAYMENT/DEPOSIT_REQUIRED/FULL_PREPAYMENT_REQUIRED), check-in payment-gate UI (this session's Phase 0E-C29 track, fully closed). **`InvoiceItem` already snapshots `unitPrice`/`totalPrice`/`description` at creation time** — the "historical price snapshot" risk MedPro's notes flagged is already mitigated. |
| 13 | Roles and permissions | **Implemented — already richer than MedPro showed** | `UserRole` enum: SUPER_ADMIN, ORG_ADMIN, BRANCH_ADMIN, DOCTOR, NURSE, SECRETARY, ACCOUNTANT, TECHNICIAN. Backend `@Roles()` decorators consistently applied per-endpoint; frontend `apps/web/src/lib/permissions.ts` mirrors this for nav/page guards. MedPro's video notes never showed role differentiation directly (every note recorded "Permissions implied: None directly observed") — Elaji already exceeds the confirmed MedPro reference here. |
| 14 | Audit logs | **Implemented** | `AuditLog` model (`userId`, `organizationId`, `action`, `resource`, `resourceId`, `oldData`/`newData`), written via `AuditLogsWriterService` and used across queue/billing/etc. (confirmed directly this session). A platform-level audit log viewer exists (`NAV_PLATFORM_AUDIT_LOGS_ROLES`, SUPER_ADMIN only). Coverage of *which* mutations are logged was not exhaustively audited in this pass — **needs inspection** for full coverage mapping. |
| 15 | Tenant isolation | **Implemented — consistent pattern** | `organizationId` present and indexed on every tenant-scoped model; `assertOwnership`/`resolveReadOrgId`/`assertOrgAccess`-style guards present in 16 service files inspected. `patients.service.ts` enforces the same scoping via inline `caller.organizationId` filters rather than a named helper — functionally consistent, just a naming inconsistency worth normalizing later (not a security gap). |

---

## 2. Gap Analysis

| Area | MedPro reference behavior | Elaji current state | Gap | Priority |
|---|---|---|---|---|
| Visit types | Free-form, admin-creatable rows; insurance code field; price incl. zero | Fixed enum (`VisitTypeCode`, 5 values), one per org per code, no insurance code | Elaji cannot have e.g. two different "consultation" visit types with different prices; no insurance code | P2 |
| Medical services catalog | Variable-price flag, multi-session flag + session count, insurance code | `Service` has none of these three | No support for variable-price or multi-session services (e.g. physiotherapy packages) | P2 |
| Medical service requests | Separate entity: request date, requested-by, doctor, payment status, **execution status** (independent of payment) | **Closed (2026-06-28)** — `MedicalServiceRequest` implemented with independent execution/payment status; see Roadmap Sprint 3 | — | P1 — Closed |
| Patient registration fields | Branch field, photo, marketing channel, companion, insurance section | None of these exist on `CreatePatientDto`/`Patient` | Minor field-richness gap; not blocking | P3 |
| Patient duplicate detection | Open question in MedPro notes (never confirmed) | **Already implemented** (`GET /patients/check-duplicate`) | None — Elaji is ahead here | — |
| Medical timeline financial events | Not directly observed in MedPro (no timeline concept shown there at all) | Timeline exists but has no invoice/payment event types | Financial activity invisible on patient timeline | P2 |
| Prescription templates | "Save as template" button shown in MedPro (video 04) | No template concept in `Prescription` model | Doctors must re-type repeat prescriptions | P2 |
| Dental chart | Full tooth chart (1–32), procedure categories, status legend (video 04) | No dental model at all | Out of scope for general clinic MVP — correctly deferred | P3 |
| Clinic-level patient-file field configuration | Per-clinic toggles for medical history / social history / treatment plan fields (video 06) | No field-visibility configuration layer; Elaji's clinical fields are fixed on `Encounter` | Cannot tailor the clinical form per specialty/clinic | P2 |
| Visit clinical detail inline in patient file's visit/appointment list | Expandable row showing chief complaint/diagnosis/notes (video 04) | Unclear whether `patient-appointments-tab.tsx` surfaces this — **needs inspection** | Possible UX gap, not confirmed | P2 (pending inspection) |
| Roles/permissions | Never demonstrated in any MedPro video | Already implemented, 8 roles, consistently enforced | None — Elaji ahead | — |
| Tenant isolation | Not applicable (MedPro is not shown as multi-tenant in these videos) | Already implemented, consistent `organizationId` scoping | None — Elaji ahead | — |
| Historical price snapshot | Flagged as a risk in MedPro notes (price change after billing) | Already mitigated — `InvoiceItem` snapshots price/description at creation | None — Elaji already safe | — |

---

## 3. Architecture Risks

- **Tenant isolation:** Strong and consistent across 16 inspected service files. One minor inconsistency: `patients.service.ts` doesn't use the same named `assertOwnership` helper as other services, relying instead on inline `caller.organizationId` filters — functionally equivalent, but worth normalizing for code-review consistency, not a live risk.
- **Patient data privacy:** Patient demographic fields are read-gated by role (`DOCTOR`/`SECRETARY`/`NURSE`/`ACCOUNTANT`/`ORG_ADMIN`/`SUPER_ADMIN` per the patients controller) — no anonymous or cross-role leak observed in this pass.
- **Financial data permissions:** Confirmed in the Phase 0E-C29 closure review (this session) — `DOCTOR`/`NURSE` can read invoices but never mutate them; only `SECRETARY`/`ACCOUNTANT`/`ORG_ADMIN`/`SUPER_ADMIN` can issue/record payments. Consistent with MedPro's implied (but never confirmed) separation.
- **Audit log coverage:** Present and used in the modules directly inspected this session (queue, billing). A full mutation-by-mutation coverage audit (which controllers/services write an `AuditLog` entry and which don't) was **not performed** in this pass — recommend as a dedicated, narrow follow-up rather than assuming full coverage.
- **Appointment/visit/queue state consistency:** Already exercised heavily and fixed in this session's Phase 0E-C29 track (date-window bug, invalidation-timing bug, cancelled-invoice precedence bug) — current state is consistent as of the last commit in that track (`ff96a58`).
- **Billing/payment consistency:** Same — closed out in Phase 0E-C29. One narrow, pre-existing, documented limitation remains: a lab/radiology item added to the *same* invoice between check-in and payment collection would inflate the figure shown in the payment overlay (see Phase 0E-C29 closure report) — narrow window, role-restricted, not introduced by recent work.
- **Historical price snapshot risk:** Already mitigated — `InvoiceItem` stores `unitPrice`/`totalPrice`/`description` directly at creation, not a live FK-computed value. This was a risk MedPro's notes correctly flagged as a thing to watch for; Elaji's existing design already avoids it.
- **Deletion vs. soft delete:** Consistently soft-delete (`deletedAt` field) across `Patient`, `Appointment`, `Encounter`, `Invoice`, `VisitType`, `Service`, `Prescription`, `LabOrder`, etc. — no hard-delete pattern observed for clinical/financial records in this pass. Consistent with MedPro's apparent preference for disable-over-delete (video 02/03 showed status toggles, no delete action for catalog rows).

---

## 4. Recommended Domain Model Direction

No schema changes are proposed or implied by this section — current-existence and risk notes only.

| Entity | Current existence | Should it be added/changed? | Relationships | Risks |
|---|---|---|---|---|
| **Patient** | Exists, mature | No structural change needed now; field-richness additions (branch, photo, insurance) are P3 | → Allergy, Appointment, Encounter, Invoice, MedicalTimelineEvent, ClinicPatient | None new |
| **Appointment** | Exists, mature | No change needed | → Patient, Doctor, VisitType, QueueEntry, Encounter, Invoice | None new |
| **Visit** | No separate model — covered by **Encounter** | Keep as-is; do not introduce a redundant "Visit" model. If MedPro-style waiting-time/payment-status-on-visit-row UX is wanted, it can be composed from existing Appointment + QueueEntry + Invoice data, not a new entity | — | Avoid duplicating Appointment/Encounter responsibilities |
| **QueueEntry** | Exists, mature | No change needed | → Appointment, Organization | None new |
| **VisitType** | Exists, narrower than MedPro's | Consider whether the fixed `VisitTypeCode` enum should become admin-extensible — **decision needed, not yet made** | → Appointment, InvoiceItem | Changing from enum to free-form would be a real schema change — out of scope for this report |
| **MedicalService** | Exists as `Service` | Consider adding `hasVariablePrice`/`isMultiSession`/`sessionCount` fields if a real use case emerges — **not yet justified by confirmed Elaji need**, only by MedPro reference | → InvoiceItem, Department | Premature addition without a confirmed Elaji use case is itself a risk (speculative schema growth) |
| **MedicalServiceRequest** | **Implemented (2026-06-28)** — was "Does not exist" | Shipped with execution tracking independent of billing (request → execute/cancel → bill, live-derived `paymentStatus`), a patient-profile tab, timeline events, and a cross-patient work queue — see `ELAJI_IMPLEMENTATION_ROADMAP.md` Sprint 3 closure | Relates to: Patient, Service, Doctor (nullable), Encounter/Appointment (nullable), InvoiceItem | Closed — no longer a candidate, it's built |
| **PaymentRequest** | Does not exist — `Invoice` already serves this role | No separate entity needed | — | None — would be redundant with Invoice |
| **Invoice** | Exists, mature | No change needed | → Patient, Appointment, Encounter, InvoiceItem, Payment | None new |
| **Payment** | Exists, mature | No change needed | → Invoice, User (received/voided by) | None new |
| **Prescription** | Exists, linked to Encounter only | Consider a `PrescriptionTemplate` entity if recurring-prescription UX becomes a priority — **not urgent** | → Encounter | None new |
| **PatientTimelineEvent** | Exists as `MedicalTimelineEvent` | Consider adding `INVOICE_ISSUED`/`PAYMENT_RECORDED` event types so financial activity is visible on the timeline — **smallest, lowest-risk addition identified in this entire pass** | → Patient, Organization, User | Purely additive enum value + a few new `.log()` call sites — very low risk |

---

## Open questions

- Does `patient-appointments-tab.tsx` (or any other patient-file tab) surface `Encounter` clinical detail (chief complaint, diagnosis) inline, matching MedPro's expandable-row pattern? Needs direct inspection.
- What is the full mutation-by-mutation audit log coverage map across all modules (not just queue/billing, which were directly confirmed)?
- Should `VisitType`'s fixed enum (`VisitTypeCode`) become admin-extensible, or is the current closed set (CONSULTATION/FOLLOW_UP/EMERGENCY/PROCEDURE/FREE_VISIT) intentional and sufficient for Elaji's target clinics?
- Is there real near-term demand for variable-price or multi-session services, or is this purely a MedPro-observed pattern with no confirmed Elaji need yet?
- Should Elaji introduce a `MedicalServiceRequest` execution-tracking concept, or is "Invoice issued = service considered requested" sufficient for the first real clinic?

See `docs/elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md` for how these gaps are sequenced into sprints.
