# Product Roadmap State

> Documentation only — no code changes. Classifies every product capability area by build maturity as of 2026-06-21 (commit `13890c4`). Grounded in direct code inspection from the architecture docs in this folder ([System Architecture.md](System%20Architecture.md), [Modules.md](Modules.md), [Database Schema.md](Database%20Schema.md), [Permissions Matrix.md](Permissions%20Matrix.md), [API Map.md](API%20Map.md), [Architecture Audit Report.md](Architecture%20Audit%20Report.md)) plus project build-history memory (test counts, production-verification notes). Where a classification rests on memory rather than a fresh read in this pass, that's called out — re-verify before treating it as current fact for anything load-bearing.

## Classification Definitions

| Tier | Meaning |
|---|---|
| **Production Ready** | Fully implemented, role-gated, tested (test count confirmed where known), and confirmed deployed/verified in production per project history. |
| **Mostly Complete** | Core workflow is implemented and usable, but has a known gap, unverified edge case, or incomplete coverage (e.g. partial audit logging, no confirmed test count). |
| **Foundation Exists** | Schema and/or partial backend logic exists, but a critical piece (UI, the actual value-delivering action, or an entire user-facing flow) is missing. |
| **Placeholder Only** | Folder/name exists in the codebase with zero implementation — confirmed by direct file listing. |
| **Not Started** | No schema, no folder, no code, no UI — does not exist anywhere in the codebase. |

## Summary Table

| Module | Classification | Recommended Priority |
|---|---|---|
| Auth & Sessions | Production Ready | Low (maintain) |
| Users & Staff Accounts | Production Ready | Low |
| Organizations, Branches & Departments | Production Ready | Low |
| Patients (Records) | Production Ready | Low |
| Appointments | Production Ready | Low |
| Doctor Scheduling | Production Ready | Low |
| Queue / Check-in | Production Ready | Low |
| Encounters | Production Ready | Low |
| Prescriptions | Production Ready | Low |
| Labs | Production Ready | Low |
| Radiology | Production Ready | Low |
| Medical Files | Production Ready | Low |
| Clinical Reports | Mostly Complete | Low-Medium |
| Allergies | Production Ready | Low |
| Medical Timeline | Production Ready | Low |
| Follow-ups & Reminders | Foundation Exists | **High** |
| Billing & Invoicing | Production Ready | Low |
| Clinic Settings & Catalog | Production Ready | Low |
| HR (Employees, Attendance, Leave, Documents) | Mostly Complete | Medium |
| Reports & Analytics | Production Ready | Low |
| Dashboard (Today Hub) | Production Ready | Low |
| Audit Logs | Mostly Complete | Medium |
| Super Admin / Platform Operations | Production Ready | Low |
| Patient Portal / Self-Service | Foundation Exists | Medium |
| Notifications (delivery) | Placeholder Only | **High** |
| Rooms / Resource Scheduling | Placeholder Only | Low (no evidence of demand) |
| AI Assistant | Placeholder Only | Low (undefined scope) |
| Inventory / Stock Management | **Not Started** | Medium-High (strategic decision needed) |

---

## A. Core Identity & Tenancy

### A1. Auth & Sessions
- **Classification:** Production Ready
- **Current state:** JWT login by phone number, `/auth/me`, self-service password change, logout. Global `JwtAuthGuard`+`RolesGuard`, rate-limited login at nginx (10/min/IP), HSTS, Swagger disabled in prod. Login/logout audit-logged (Phase 136C, production-verified).
- **Missing work:** Server-side token revocation — logout is client-side-only today (client discards JWT; token remains valid until its 24h expiry). A Redis-backed denylist is planned (project history: "Phase 136D") but Redis itself is provisioned and unused (confirmed in [Architecture Audit Report.md](Architecture%20Audit%20Report.md) §1).
- **Business value:** Critical — every other feature depends on this.
- **Technical complexity:** Low to add the denylist (Redis is already provisioned; the gap is a few hours of wiring, not a design problem).
- **Recommended priority:** Low urgency functionally (no known incident driving it), but cheap to close — worth doing opportunistically since the infrastructure is already paid for and idle.

### A2. Users & Staff Accounts
- **Classification:** Production Ready
- **Current state:** Full CRUD, bcrypt passwords, soft delete + restore, role-safety rules (ORG_ADMIN cannot create/edit SUPER_ADMIN), protected-role UI badges. 18/18 backend tests passing per project history; restore flow frontend+backend both production-verified (132B3A/B).
- **Missing work:** Staff self-registration/invite-link flow — ORG_ADMIN must still manually create every account (a gap noted in an earlier project audit and not contradicted by anything found since).
- **Business value:** High — onboarding friction for every new clinic hire.
- **Technical complexity:** Medium (invite token generation, expiry, public registration endpoint, email/SMS delivery — which itself depends on the Notifications gap below).
- **Recommended priority:** Medium — blocked in part by Notifications (delivery channel) not existing yet; reasonable to defer until that's resolved or do email-only first.

### A3. Organizations, Branches & Departments (Tenant Structure)
- **Classification:** Production Ready
- **Current state:** Organization is the tenant root with full subscription metadata; atomic onboarding endpoint (org + branch + ORG_ADMIN in one transaction); Branches/Departments are standard CRUD, org-scoped.
- **Missing work:** None identified at the structural level. BRANCH_ADMIN role exists in the schema but has very narrow backend reach today (confirmed: only Follow-ups full access + read-only on 4 catalog/config endpoints) — true branch-level delegated administration is not built out, despite the role existing.
- **Business value:** Critical — multi-tenant SaaS foundation.
- **Technical complexity:** N/A for current state; building out real BRANCH_ADMIN delegation would be Medium complexity (mostly permission-matrix expansion, not new data model).
- **Recommended priority:** Low — revisit only if a customer specifically needs branch-level admin delegation.

---

## B. Clinical Operations

### B1. Patients (Records)
- **Classification:** Production Ready
- **Current state:** Full CRUD, auto-MRN, demographic + bilingual fields, soft delete, cross-organization linking (`ClinicPatient`, link-request/verify-code flow) fully shipped per project history (Phase 126B/C/D all closed, backfill complete, all 10 patient-adjacent modules use `assertPatientLinkedToOrg`).
- **Missing work:** Phase 126E ("Platform Patient Search & Duplicate Detection") was explicitly left at the planning stage per project history — no implementation. This is an enhancement on top of an already-working core, not a core gap.
- **Business value:** Critical — the central record every other clinical module hangs off of.
- **Technical complexity:** Core: done. Duplicate-detection enhancement: Medium (fuzzy matching on name/DOB/national ID across orgs).
- **Recommended priority:** Low for the core; Medium if duplicate patient records across clinics are becoming an observed operational problem.

### B2. Appointments
- **Classification:** Production Ready
- **Current state:** Full status workflow (`SCHEDULED→...→COMPLETED`/`CANCELLED`/`NO_SHOW`), double-booking prevention, slot validation against Doctor Schedules, subscription-gated writes. 20/20 backend tests per project history.
- **Missing work:** None identified.
- **Business value:** Critical — core scheduling workflow.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B3. Doctor Scheduling
- **Classification:** Production Ready
- **Current state:** Weekly recurring hours + date-specific exceptions (holiday/leave/custom hours), available-slots computation, consumed by Appointments for validation.
- **Missing work:** None identified beyond the general BRANCH_ADMIN delegation gap noted in A3.
- **Business value:** High — prevents invalid bookings, directly reduces no-shows/conflicts.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B4. Queue / Check-in
- **Classification:** Production Ready
- **Current state:** Atomic check-in with daily-reset ticket numbering, nurse triage (vitals + chief-complaint draft prefilling the encounter), walk-in modal, full status workflow. Multiple sub-phases (134B3/4/5) all production-verified.
- **Missing work:** None identified.
- **Business value:** High — the operational heartbeat of a same-day clinic.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B5. Encounters
- **Classification:** Production Ready
- **Current state:** Idempotent creation (re-opening returns existing record, no duplicates), vitals (JSON), ICD-10 lookup with combobox, quick-fill from prior visits, diagnosis warning on close, print view (Phase 60, feature-complete for MVP per project history).
- **Missing work:** None identified for MVP scope; Phase 60.3 (print polish) was explicitly marked optional.
- **Business value:** Critical — the clinical record of the visit itself.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B6. Prescriptions
- **Classification:** Production Ready
- **Current state:** Scoped through encounter, DOCTOR-owned delete during active encounter only, 23/23 backend tests per project history.
- **Missing work:** No e-prescribing/pharmacy integration (out of scope unless explicitly desired) — not a current gap, just an unbuilt future expansion.
- **Business value:** High.
- **Technical complexity:** N/A for current scope.
- **Recommended priority:** Low.

### B7. Labs
- **Classification:** Production Ready
- **Current state:** Full 6-status workflow (ORDERED→...→REVIEWED), role-gated transitions (DOCTOR orders/reviews, NURSE/TECHNICIAN handle operational steps), 32/32 backend tests, audit-logged.
- **Missing work:** No lab-equipment/LIS integration (results are manually entered) — reasonable for current scale, flagged only as a future consideration.
- **Business value:** High.
- **Technical complexity:** N/A for current scope; LIS integration would be High complexity if pursued.
- **Recommended priority:** Low.

### B8. Radiology
- **Classification:** Production Ready
- **Current state:** Mirrors Labs structurally, 35/35 backend tests, audit-logged.
- **Missing work:** No PACS/DICOM integration — images are tracked as metadata via Medical Files, not viewed in-app. Same future-consideration caveat as Labs.
- **Business value:** High.
- **Technical complexity:** N/A for current scope.
- **Recommended priority:** Low.

### B9. Medical Files
- **Classification:** Production Ready
- **Current state:** Presigned-URL upload/download via MinIO, metadata-only DB records, 28/28 backend tests, download access audit-logged (Phase 136C, verified safe — no storage keys/URLs leaked into logs).
- **Missing work:** None identified.
- **Business value:** High — supports scans, referrals, consent forms, ID documents.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B10. Clinical Reports
- **Classification:** Mostly Complete
- **Current state:** DRAFT→FINALIZED lifecycle, Puppeteer/Chromium PDF rendering, "save rendered PDF as a permanent Medical File" action.
- **Missing work:** No explicit automated-test count for this module was found in project history (other clinical modules cite specific pass counts; this one doesn't) — a documentation/confidence gap rather than a confirmed functional one. Worth a deliberate test-coverage check rather than assuming parity with Labs/Radiology.
- **Business value:** Medium-High — formal exportable clinical documentation (referral letters, discharge summaries).
- **Technical complexity:** N/A for current scope.
- **Recommended priority:** Low-Medium — primarily to close the test-coverage confidence gap, not to add features.

### B11. Allergies
- **Classification:** Production Ready
- **Current state:** Simple nested CRUD under Patients, 18/18 backend tests, severity badges localized (EN/AR).
- **Missing work:** None identified. (Note: schema shows `deletedAt`+`deletedBy` columns despite project history describing this as a "hard delete" module — a minor documentation inconsistency flagged in [Database Schema.md](Database%20Schema.md) §6, not a functional gap.)
- **Business value:** High — patient safety critical.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B12. Medical Timeline
- **Classification:** Production Ready
- **Current state:** Read-only aggregated event feed per patient, written to passively by encounters/labs/radiology/prescriptions/medical-files/clinical-reports, 12/12 backend tests.
- **Missing work:** None identified.
- **Business value:** High — single source of "what happened to this patient and when" for clinical continuity.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### B13. Follow-ups & Reminders
- **Classification:** Foundation Exists
- **Current state:** Reminder scheduling against an encounter, status tracking (`PENDING→SENT/FAILED/CANCELLED`), patient-response recording (confirmed/no-response/declined/reschedule-requested), org-wide and doctor-scoped list views, BRANCH_ADMIN included in role grants.
- **Missing work:** **No actual delivery mechanism exists.** The `ReminderChannel` enum supports `SMS`/`WHATSAPP`/`EMAIL`/`IN_APP`, and the controller's own Swagger doc comment states reminder creation results in "a PENDING record only, no actual sending." The entire value proposition of a follow-up reminder system — actually reaching the patient — is unbuilt. Today this is a manual worklist for staff to call patients themselves, not an automated reminder system.
- **Business value:** Medium-High — automated reminders measurably reduce no-show/follow-up-loss rates in clinic operations; this is a well-understood, high-ROI feature category.
- **Technical complexity:** Medium-High — requires a third-party SMS/WhatsApp Business API/email-sending integration, delivery-status webhooks, retry/failure handling, and almost certainly per-country regulatory/opt-in considerations (especially WhatsApp Business API and SMS in many markets).
- **Recommended priority:** **High** — this is the single biggest "looks done but isn't" gap in the system: the data model and UI imply a working reminder system, but it doesn't actually contact anyone.

---

## C. Financial

### C1. Billing & Invoicing
- **Classification:** Production Ready
- **Current state:** Full `DRAFT→ISSUED→PARTIALLY_PAID→PAID/CANCELLED` lifecycle, atomic item/payment operations, auto-invoice-on-checkin (policy-configurable), invoice PDF generation, payment void with reason tracking, daily cashier summary, 36/36 backend tests. Multiple production-verified phases (134A, 134A-fix, 135A).
- **Missing work:** No online/card payment gateway integration — payments are recorded manually (cash/card/bank-transfer/insurance/other as a label, not processed through a gateway). This was flagged as a future "Phase 2: Monetization" item in an earlier project audit; status since then not re-confirmed in this pass.
- **Business value:** Critical — revenue cycle.
- **Technical complexity:** Current scope: N/A. Payment gateway integration: High (PCI scope, reconciliation, webhooks, partial-refund handling).
- **Recommended priority:** Low for current scope; Medium if/when a customer needs online prepayment or card-on-file.

### C2. Clinic Settings & Catalog (Visit Types / Services)
- **Classification:** Production Ready
- **Current state:** Working hours + lunch window + timezone configuration, visit-type catalog (consultation/follow-up/emergency/procedure/free-visit with duration+price), service/procedure catalog with department linkage and pricing — both feed Appointments and Invoice line items.
- **Missing work:** None identified.
- **Business value:** High — every appointment and invoice line ultimately prices off this catalog.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

---

## D. HR / Workforce

### D1. HR — Employee Profiles, Attendance, Leave, Documents
- **Classification:** Mostly Complete
- **Current state:** This is the most recently and actively developed area of the system — the last 5 commits before this audit are all HR phases (147D through 147G: schema, frontend, attendance/leave UX, dashboard metrics). `EmployeeProfile` deliberately decoupled from `User` (supports HR-only staff with no login). Attendance is one-record-per-day manual entry; Leave requests have a full create/decide/respond workflow. Employee Document upload is **confirmed fully implemented** (audited 2026-06-21 — presigned upload/download/list/delete, with ACCOUNTANT deliberately excluded from document access for privacy reasons).
- **Missing work:** (1) No biometric/device attendance integration — entry is manual by design, a real scaling limitation for larger staff counts. (2) No payroll calculation/payroll-run engine — `baseSalary` is stored but nothing computes net pay, deductions, or generates payslips. (3) Approving a leave request does not cascade to `employmentStatus` (deliberate per a schema comment, but worth confirming this matches actual HR-process expectations as the feature matures).
- **Business value:** High — staff cost and compliance (attendance/leave records) are major operational concerns for any clinic of meaningful size.
- **Technical complexity:** Biometric integration: Medium-High (device/vendor-dependent). Payroll engine: High (tax/deduction rules are jurisdiction-specific and easy to get expensively wrong).
- **Recommended priority:** Medium — given the visible recent investment here, this looks like an active roadmap track already; the natural next increment is likely payroll calculation if that's the product direction, but that should be a deliberate scoping decision, not an assumed default.

---

## E. Insights & Governance

### E1. Reports & Analytics
- **Classification:** Production Ready
- **Current state:** Summary/appointments/clinical/queue/billing/cashier-summary endpoints, computed analytics with role-based scoping (SUPER_ADMIN cross-org, others org-scoped), 12/12 backend tests, timezone-aware cashier reconciliation.
- **Missing work:** None identified at the reporting-endpoint level. No scheduled/exported reports (e.g. emailed monthly PDF) — purely on-demand in-app today.
- **Business value:** High — operational and financial visibility for clinic management.
- **Technical complexity:** N/A for current scope.
- **Recommended priority:** Low.

### E2. Dashboard (Today Hub)
- **Classification:** Production Ready
- **Current state:** `/dashboard/overview` (role-scoped stat cards) and `/dashboard/today` (consolidated per-visit rows joining appointment+patient+doctor+queue+encounter+invoice), DOCTOR responses filtered to own patients.
- **Missing work:** None identified.
- **Business value:** High — the default landing experience for most operational roles.
- **Technical complexity:** N/A.
- **Recommended priority:** Low.

### E3. Audit Logs
- **Classification:** Mostly Complete
- **Current state:** Read API is solid (SUPER_ADMIN only, filterable by org/user/action/resource/date, 14/14 backend tests, immutable by design). Writer coverage has expanded incrementally across many phases — confirmed present for: auth (login/logout), billing (invoice create/issue/cancel, payment create), patients (create/update/soft-delete), labs and radiology (create/status-transition/result-or-report-entered/reviewed/soft-delete), prescriptions and appointments (create/status-transition/update/soft-delete), medical files (download access).
- **Missing work:** Writer coverage was built module-by-module over many incremental phases rather than as a single cross-cutting interceptor; this pass did not re-verify that **every** mutating endpoint across **all** ~30 modules (e.g. Employees/HR, Clinic Settings, Doctor Schedules, Visit Types/Services) writes an audit entry. Given `EmployeesModule` does import `AuditLogsModule`, some coverage likely exists there too, but exhaustive per-endpoint confirmation was out of scope for this pass.
- **Business value:** High — compliance and incident-investigation capability, especially given this handles medical records.
- **Technical complexity:** Low-Medium to close remaining gaps (the writer service and pattern are already established; it's a matter of injecting it into any modules that still lack it).
- **Recommended priority:** Medium — worth a dedicated sweep to confirm 100% coverage of sensitive write paths, given the compliance value, but not urgent (no confirmed gap, just unconfirmed completeness).

---

## F. Platform / Super Admin

### F1-F2. Organization Onboarding, Subscription Billing & Platform Admin UI
- **Classification:** Production Ready
- **Current state:** Atomic org+branch+ORG_ADMIN onboarding; platform-level `SubscriptionPayment` history (deliberately decoupled from clinic patient billing); manual subscription status controls (`TRIAL/ACTIVE/SUSPENDED/EXPIRED/CANCELLED`); `SubscriptionGuard` blocking clinical/financial writes for orgs with inactive subscriptions; frontend `PlatformOnlyGuard` confining SUPER_ADMIN to platform-only routes by default; multiple hardening passes already shipped (133E/136A safety fixes, audit logging on auth/billing/files).
- **Missing work:** No self-serve billing portal for clinic owners (e.g. clinic admin viewing/paying their own subscription invoice) — subscription payments are recorded by SUPER_ADMIN on the platform side only, not initiated by the tenant. No automated dunning/suspension-on-non-payment workflow — subscription status changes are manual.
- **Business value:** Critical — this is the entire SaaS revenue mechanism for the platform operator.
- **Technical complexity:** Self-serve billing portal + payment gateway: High. Automated dunning: Medium.
- **Recommended priority:** Low for current single-operator-manages-billing model; Medium-High if/when the business needs to scale past a level where manual subscription tracking by SUPER_ADMIN is sustainable.

### F3. Patient Portal / Self-Service
- **Classification:** Foundation Exists
- **Current state:** `Patient.platformId` (unique) and `Patient.hasPortalAccess` (boolean) columns exist; the `ClinicPatient` link/verify-code flow (Phase 126) establishes the data model for a patient identity that spans multiple clinics. This is explicit groundwork for a future patient-facing portal.
- **Missing work:** Everything patient-facing: there is no `PATIENT` value in the `UserRole` enum, no patient login/auth strategy, no patient-facing frontend app or routes, and no patient-scoped API surface (booking their own appointments, viewing their own results, paying their own invoices). The "platform identity" concept exists only as backend plumbing serving cross-clinic *staff-side* patient linking today — not an actual self-service experience.
- **Business value:** Medium-High — patient self-service (booking, viewing results, paying bills) is a common competitive differentiator and reduces front-desk load, but is a substantial net-new product surface, not an extension of existing staff tooling.
- **Technical complexity:** High — effectively a second, smaller application: separate auth strategy, separate frontend (or at minimum a separate route tree with different UX assumptions), new patient-scoped API endpoints with their own access-control model distinct from the staff `UserRole` system, and careful scoping of exactly what a patient can see/do per clinic.
- **Recommended priority:** Medium — valuable, but should be scoped as a deliberate, standalone initiative rather than an incremental add-on; the existing groundwork (`platformId`/`hasPortalAccess`/`ClinicPatient`) means the data model question has already been thought through, which lowers the eventual lift.

---

## G. Not Yet Built

### G1. Notifications (delivery infrastructure)
- **Classification:** Placeholder Only
- **Current state:** `apps/api/src/modules/notifications/` contains only `.gitkeep` — confirmed by direct audit. Not imported in `app.module.ts`. No in-app, SMS, WhatsApp, email, or push notification delivery exists anywhere in the codebase for *any* feature.
- **Missing work:** Entire capability — a notification-sending service (likely starting with a single channel, e.g. SMS or email), provider integration, delivery tracking, and consumers in at least Follow-ups (B13) and potentially Users (A2, for invite emails) and Billing (payment reminders/receipts).
- **Business value:** High — this is a foundational capability that at least two other roadmap items (Follow-up reminders, Staff invite flow) are blocked on.
- **Technical complexity:** Medium — the hard parts are provider selection/integration and deliverability, not the internal architecture (a single `NotificationsService` with a pluggable channel adapter is a well-trodden pattern).
- **Recommended priority:** **High** — building this unblocks Follow-ups (B13) and improves Staff Accounts (A2); recommend treating it as a shared platform capability rather than building bespoke SMS code inside the Follow-ups module.

### G2. AI Assistant
- **Classification:** Placeholder Only
- **Current state:** `apps/api/src/modules/ai-assistant/` contains only `.gitkeep` — confirmed by direct audit. Not imported in `app.module.ts`. No scope, design, or product requirement for this capability was found anywhere in code, schema, or project history.
- **Missing work:** Everything, starting with **product scope** — there is no documented intent for what this module is meant to do (clinical decision support? scribing/note-summarization? scheduling assistant? patient-facing chat?). Scoping is itself the first deliverable.
- **Business value:** Unknown — cannot be assessed without a defined use case.
- **Technical complexity:** Unknown — varies enormously by scope (a note-summarization feature is a very different project than clinical decision support, which carries regulatory/liability weight in a medical context).
- **Recommended priority:** Low until scoped — recommend a product-definition exercise before any engineering investment; do not treat the empty folder as evidence of commitment to a particular feature.

### G3. Rooms / Resource Scheduling
- **Classification:** Placeholder Only
- **Current state:** `apps/api/src/modules/rooms/` contains only `.gitkeep` — confirmed by direct audit. Not imported in `app.module.ts`. No equivalent concept (exam rooms, procedure rooms, equipment booking) exists anywhere else in the schema or codebase.
- **Missing work:** Everything — a `Room`/`Resource` model, availability/booking logic (likely mirroring the Doctor Schedules pattern), and integration into Appointments (assigning a room alongside a doctor).
- **Business value:** Medium — relevant primarily for larger clinics/hospitals with multiple simultaneous rooms or shared equipment (e.g. an ultrasound machine); less relevant for single-doctor or small-clinic deployments, which appear to be the current primary use case based on the rest of the system's design (single-doctor-per-encounter assumptions throughout).
- **Technical complexity:** Medium — the Doctor Scheduling pattern (recurring availability + exceptions + slot validation) is a directly reusable template.
- **Recommended priority:** Low — no evidence in the current codebase or project history of customer demand driving this; recommend validating demand before building, since the underlying pattern is cheap to build once actually needed.

### G4. Inventory / Stock Management
- **Classification:** **Not Started**
- **Current state:** No schema model, no module folder, no frontend route, no mention anywhere in the codebase (confirmed via codebase-wide search — only false-positive matches on unrelated words like "supply" in prose text). This is notable because Inventory was named as one of the core modules in this project's original architecture documentation brief, alongside Auth/Patients/Appointments/Billing/HR — yet it has zero footprint in the actual system.
- **Missing work:** Everything — item/SKU catalog (medical supplies, drugs, consumables), stock levels per branch, reorder thresholds, supplier/purchase tracking, expiry-date tracking (important for medical consumables/drugs specifically), and likely integration points with Billing (consuming stock against an invoice line item) and possibly Prescriptions (drug stock depletion).
- **Business value:** Depends heavily on target customer profile: **High** for hospital/polyclinic organizations that stock and dispense drugs/supplies directly; **Low-Medium** for small outpatient clinics that don't manage physical stock. The `OrganizationType` enum (`HOSPITAL/CLINIC/POLYCLINIC`) suggests the product already targets a range of organization types, some of which would plausibly need this.
- **Technical complexity:** Medium-High — stock-level tracking with concurrent decrement safety (similar atomicity requirements to Billing's item/payment transactions), expiry tracking, and reporting are individually moderate but add up; integration with Billing/Prescriptions adds cross-module complexity.
- **Recommended priority:** **Medium-High, contingent on a strategic decision** — this is not a "build next" item by default; it's a "decide if this is in scope for the product at all" item. Recommend a deliberate go/no-go conversation (is the target customer base hospital-type orgs that need this, or purely outpatient clinics that don't?) before estimating or scheduling this work, rather than defaulting to building it because it was named in an early architecture brief.

### Note: Redundant Placeholder Folders
`staff` and `staff-scheduling` (`apps/api/src/modules/staff/`, `apps/api/src/modules/staff-scheduling/`) are also confirmed `.gitkeep`-only placeholders, but unlike G1-G4 above, these do **not** represent missing functionality — their intended purpose is already fully served elsewhere: staff accounts by `UsersModule` (A2) and staff scheduling/attendance/leave by `EmployeesModule` (D1). These two folders are most likely dead naming artifacts from an earlier architectural plan that was superseded. Recommend deleting them (a documentation/repo-hygiene action, not a feature gap) rather than carrying them on any future roadmap.

---

## How to Use This Document

- **If prioritizing by "biggest gap relative to apparent completeness":** Follow-ups & Reminders (B13) and Notifications (G1) are the two items most likely to surprise a stakeholder who assumes "it's in the product" — the UI and data model exist, but the actual patient-contact mechanism does not.
- **If prioritizing by "what unblocks the most other work":** Notifications (G1) is a dependency for both B13 and part of A2.
- **If prioritizing by "strategic scope decision needed before estimating":** Inventory (G4) and AI Assistant (G2) — both require a product/business decision before they can even be sized, let alone scheduled.
- **If prioritizing by "active momentum, keep going":** HR (D1) is clearly the team's current focus area (5 of the last 5 commits) — the natural next conversation is whether payroll calculation is in scope, not whether to keep investing in HR generally.
