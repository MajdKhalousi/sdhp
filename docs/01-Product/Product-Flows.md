# Product Flows

**Status:** Approved Draft
**Last updated:** Phase 0C-C

## Purpose

This document maps how users actually move through Elaji Health's current clinic operating workflows — entry routes, steps, screens, and handoffs between modules. It documents **current product behavior, based on direct code inspection (Phase 0C-A) and follow-up clarification (Phase 0C-B)** — not future wishes. Where a flow has a genuine gap or an unverified piece, this document says so rather than smoothing it over.

## Flow Summary

| Flow | Primary User | Entry Route | Status | Notes |
|---|---|---|---|---|
| Reception / Appointment | SECRETARY | `/dashboard/today` (daily), `/dashboard/appointments` (planning) | Complete | See [Decision 009](../00-Company/Decisions/Decision-009-Reception-Daily-Command-Center.md) |
| Walk-in | SECRETARY / NURSE | Queue screen (`WalkInWizard`) | Complete | Two-step create-then-check-in |
| Doctor Clinical | DOCTOR | `/dashboard/doctor`, `/dashboard/doctor/queue` | Complete | Single-workspace encounter screen hosts all sub-records |
| Billing / Cashier | SECRETARY / ACCOUNTANT | `/dashboard/invoices`, `/dashboard/cashier`, inline via Today Hub | Complete | Auto-invoice on check-in confirmed in code |
| Patient Profile | Most clinical/front-desk roles | `/dashboard/patients` | Complete | Longitudinal patient view |
| Technician Labs/Radiology | TECHNICIAN | `/dashboard/technician/labs`, `/technician/radiology` | Complete | Result/report entry → doctor review handoff confirmed |
| Admin / Settings | ORG_ADMIN | `/dashboard/settings/*`, `/dashboard/doctors/*` | Complete | Two pages are intentional redirect stubs |
| HR / Payroll | ORG_ADMIN | `/dashboard/hr` | Complete | See [Decision 010](../00-Company/Decisions/Decision-010-HR-Employee-vs-User-Account.md) |
| Platform / Super Admin | SUPER_ADMIN | `/dashboard/platform/*` | Complete | Platform-operator flow, not clinic-pilot-facing |

## 1. Reception / Appointment Flow

- **Primary user:** SECRETARY / reception.
- **Primary daily route:** `/dashboard/today`.
- **Appointment management route:** `/dashboard/appointments`.
- **Steps:**
  1. View today's clinic activity (Today Hub).
  2. Search/select patient or create appointment from appointment management.
  3. Check in patient.
  4. Queue handoff.
  5. Start/open encounter when appropriate.
  6. View/create invoice when appropriate.
  7. Collect payment when appropriate.

Today Hub is the daily command center — it joins appointment, patient, doctor, queue, encounter, and invoice state into one per-visit row with inline actions. Appointments remains the planning/search/detail management area: status filtering across all statuses, pagination across many days, and the appointment-creation entry point. See [Decision 009](../00-Company/Decisions/Decision-009-Reception-Daily-Command-Center.md) for the full rationale.

## 2. Walk-in Flow

- Entry from the queue/check-in workflow (`WalkInWizard`).
- Select an existing patient.
- Choose doctor, visit time/duration/type.
- Create walk-in appointment (`isWalkIn: true`).
- Check in.
- A queue entry is created.
- Doctor receives the patient through the queue/encounter flow.

## 3. Doctor Clinical Flow

- Doctor queue (`/dashboard/doctor/queue`).
- Open encounter (`/dashboard/doctor/encounter/[id]`).
- Clinical notes/encounter documentation.
- Prescriptions.
- Labs.
- Radiology.
- Medical files.
- Clinical reports.
- Follow-up booking/tracking.
- End encounter.

Follow-up tracking exists (scheduling, status, patient-response recording), but **actual notification sending (SMS/WhatsApp/Email) is not confirmed** — no code path was found that sends a message; this depends on the empty `notifications` module.

## 4. Billing / Cashier Flow

- Auto-invoice on check-in, when the organization's billing policy allows it.
- Manual invoice creation from the appointment detail page or Today Hub when no invoice yet exists.
- Draft invoice → add/remove items.
- Issue invoice.
- Collect payment (on the invoice detail page, or inline from Today Hub).
- Invoice status updates automatically (DRAFT → ISSUED → PARTIALLY_PAID → PAID).
- Cashier daily reconciliation (`/dashboard/cashier`).
- Print invoice view (dedicated print route).

## 5. Patient Profile Flow

- Patient list/search (`/dashboard/patients`).
- Patient detail (`/dashboard/patients/[id]`), with tabs for:
  - Overview
  - Appointments
  - Timeline
  - Allergies (within Overview / safety alerts)
  - Prescriptions
  - Labs
  - Radiology
  - Files
  - Clinical reports
  - Invoices
- Cross-organization link requests (duplicate/platform-candidate detection on patient creation → request link → verification code → `/dashboard/patients/pending-links` for managing outstanding requests).

This is the **longitudinal patient view** — the place to see a patient's full history across visits, not a single-visit screen.

## 6. Technician Labs/Radiology Flow

- Technician worklists (`/dashboard/technician/labs`, `/technician/radiology`), split into pending and completed-today.
- Status progression (Labs: ORDERED → SAMPLE_COLLECTED → IN_PROGRESS → RESULTED → REVIEWED; Radiology: ORDERED → SCHEDULED → IN_PROGRESS → RESULTED → REVIEWED).
- Result/report entry once an order is IN_PROGRESS.
- Doctor review handoff — a doctor reviews from the patient's Labs/Radiology tab, advancing RESULTED → REVIEWED.
- Patient detail visibility — results/reports and reviewer info both appear on the patient's Labs/Radiology tabs.

## 7. Admin / Settings Flow

- Clinic settings.
- Working days.
- Services.
- Visit types.
- Departments.
- Billing policy.
- Doctor schedules.

`dashboard/settings/employees` and `dashboard/settings/staff` are intentional compatibility redirects (to `dashboard/hr/employees` and `dashboard/hr/accounts` respectively) — not primary screens. They exist to keep old bookmarks working.

## 8. HR / Payroll Flow

- HR dashboard (`/dashboard/hr`).
- Employee profiles.
- Attendance.
- Leave.
- Documents.
- Accounts.
- Payroll (DRAFT → APPROVED → PAID lifecycle).

Per [Decision 010](../00-Company/Decisions/Decision-010-HR-Employee-vs-User-Account.md): **Employee Profile** = HR/personnel record; **User Account** = login/access record; there is an optional link between them.

**Naming note:** some code/UI layers use `staff`/`users`/`accounts` to refer to the login-account concept (e.g., the Accounts page component is named `StaffTable`, its hook `useCreateStaff`, its endpoint `/v1/users`), while `employees` refers to HR profiles (`EmployeeProfile`). This is a naming inconsistency across layers, not a structural duplication — the underlying data model only has two concepts (`User` and `EmployeeProfile`), linked optionally via `EmployeeProfile.userId`.

## 9. Platform / Super Admin Flow

- Platform overview.
- Organization onboarding (atomic org + branch + first admin).
- Subscription/payment tracking (confirmed decoupled — recording a payment does not automatically change subscription status).
- Users (platform-wide).
- Audit logs (platform-wide, SUPER_ADMIN only).

This is a **platform-operator flow**, used by whoever runs the Elaji Health business itself — it is not part of a clinic's day-to-day pilot usage.

## Cross-Module Handoffs

| Handoff | Mechanism | Notes |
|---|---|---|
| Appointment → Queue | Check-in creates a `QueueEntry` 1:1 with the appointment | Confirmed in walk-in wizard and check-in button |
| Queue → Encounter | "Start Encounter" action from Today Hub / Doctor Queue | Conditional on queue/appointment state |
| Appointment/Queue → Billing | Auto-invoice on check-in | Gated by `BillingPolicy.autoCreateInvoiceOnCheckin` |
| Encounter → Labs/Radiology | Lab/Radiology order panels live inside the encounter workspace | One screen hosts the full clinical record |
| Encounter → Billing | Manual invoice creation link, gated on appointment status (COMPLETED/IN_PROGRESS) | From appointment detail or Today Hub |
| Patient → Medical Timeline | Timeline tab on patient detail | Read-only history across visits |
| Billing → Cashier | Cashier view reads the same invoice/payment data for daily reconciliation | Shared billing module |
| Labs/Radiology → Doctor Review | "Review" action from the patient's Labs/Radiology tab | Advances RESULTED → REVIEWED |
| Platform Subscription → Organization Write Access | Subscription guard blocks clinical/financial writes org-wide when inactive | Independent of HR/medical-files exemptions |

## First Clinic Readiness

| Role | Can complete daily work? | Main risk/confusion | Required decision/action |
|---|---|---|---|
| Receptionist | Yes | May not know Today Hub is the primary daily screen rather than Appointments | Communicate Decision 009 in onboarding/training |
| Doctor | Yes | None found | None identified |
| Cashier / Accountant | Yes | None found | None identified |
| Technician | Yes | None found | None identified |
| Clinic Admin | Yes | HR/account terminology (staff/users/accounts/employees) can be confusing | Communicate Decision 010 in onboarding/training |
| Super Admin | Yes (platform-internal) | Not clinic-pilot-facing — irrelevant to a pilot clinic's own staff | None required for a clinic pilot |

## Known Flow Notes

- Follow-up reminders have full tracking/status UI, but no confirmed sending mechanism (depends on the empty `notifications` module).
- HR naming across `staff`/`users`/`accounts`/`employees` can confuse new team members; [Decision 010](../00-Company/Decisions/Decision-010-HR-Employee-vs-User-Account.md) defines the product language to use going forward.
- An actual running-app walkthrough should still be done before a pilot — this document and Phase 0C-A/0C-B are based on tracing code (import chains, hooks, endpoints), which is strong evidence but not the same as observing the live UI behave correctly end-to-end.

## Related Decisions

- [Decision 009 — Reception Daily Command Center](../00-Company/Decisions/Decision-009-Reception-Daily-Command-Center.md)
- [Decision 010 — HR Employee vs User Account](../00-Company/Decisions/Decision-010-HR-Employee-vs-User-Account.md)
