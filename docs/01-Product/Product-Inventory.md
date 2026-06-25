# Product Inventory

**Last updated:** Phase 0B
**Source:** Phase 0A codebase inspection (evidence-based — direct file/code inspection, not inferred)

## Purpose

A factual record of what currently exists in the Elaji Health codebase, organized by build status. This is the basis for scope and roadmap decisions — see [../00-Company/Product-Scope.md](../00-Company/Product-Scope.md) — and should be re-verified against the code whenever it's relied on for a significant decision, not assumed to stay accurate indefinitely.

## Status Definitions

| Status | Meaning |
|---|---|
| **Complete** | Frontend, backend, and database layers all exist and are wired together; module is usable end-to-end. |
| **Partial** | Substantial implementation exists, but a meaningful piece is missing or unconfirmed (e.g., tracking exists but the action it's meant to trigger doesn't). |
| **Skeleton** | A folder/name exists in the codebase with no real implementation — confirmed by direct file listing. |
| **Not Started** | No schema, module, route, or component found anywhere for this capability. |

## Complete

| Module | Frontend | Backend | Database |
|---|---|---|---|
| Auth | `(auth)/login` | `modules/auth` | `User` |
| Patients | `dashboard/patients/*` (27 component files — the largest area in the app) | `modules/patients`, `modules/allergies` | `Patient`, `Allergy`, `ClinicPatient`, `MedicalTimelineEvent` |
| Appointments | `dashboard/appointments/*` | `modules/appointments` | `Appointment` |
| Queue / Check-in | `dashboard/queue/*` | `modules/queue` | `QueueEntry` |
| Doctor Scheduling | `dashboard/doctors/[id]/schedule` | `modules/doctor-schedules` | `DoctorSchedule`, `DoctorScheduleException` |
| Encounters (+ Prescriptions, Labs, Radiology, Medical Files, Clinical Reports) | `dashboard/doctor/encounter/[id]` (sub-records reachable from here, no standalone top-level pages by design) | `modules/encounters`, `prescriptions`, `labs`, `radiology`, `medical-files`, `clinical-reports` | `Encounter`, `Prescription`, `LabOrder`/`LabResult`, `RadiologyOrder`/`RadiologyReport`, `MedicalFile`, `ClinicalReport` |
| Billing / Invoicing | `dashboard/invoices/*`, `cashier/`, `reports/billing/` | `modules/billing` | `Invoice`, `InvoiceItem`, `Payment`, `BillingPolicy` |
| HR (profiles, attendance, leave, documents) | `dashboard/hr/*` | `modules/employees` (profiles/documents/attendance/leave controllers) | `EmployeeProfile`, `EmployeeDocument`, `AttendanceRecord`, `LeaveRequest` |
| Payroll | `dashboard/hr/payroll` | `modules/employees` (`PayrollController`/`PayrollService`) | `PayrollRun`, `PayrollLine` |
| Reports / Dashboard | `dashboard/page.tsx`, `dashboard/today/` | `modules/reports`, `modules/dashboard` | computed — no owned tables |
| Platform / Super Admin | `dashboard/platform/*` | `modules/organizations`, `subscription-payments`, `audit-logs` | `Organization`, `SubscriptionPayment`, `AuditLog` |
| Clinic Settings / Catalogs | `dashboard/settings/clinic`, `services`, `visit-types`, `billing`, `departments` | `modules/clinic-settings`, `services`, `visit-types`, `departments`, `branches` | `ClinicSettings`, `ClinicWorkingDay`, `Service`, `VisitType`, `Department`, `Branch` |

## Partial

| Module | What exists | What's missing/unconfirmed |
|---|---|---|
| Follow-ups & Reminders | Full reminder scheduling, status tracking, patient-response recording — `dashboard/follow-ups/`, `my-follow-ups/`, `modules/followups`, `FollowUpReminder` model with a `ReminderChannel` enum (IN_APP/SMS/WHATSAPP/EMAIL) | No confirmed code path that actually sends a message. The one module that would plausibly contain that (`notifications`) is empty — see Skeleton, below. |

## Skeleton (backend folder exists, contains only `.gitkeep`)

| Module | Confirmed contents |
|---|---|
| `notifications` | `.gitkeep` only |
| `ai-assistant` | `.gitkeep` only |
| `rooms` | `.gitkeep` only |
| `staff` | `.gitkeep` only. Empty placeholder; possible dead naming artifact or superseded concept — inference only, requires cleanup decision. |
| `staff-scheduling` | `.gitkeep` only. Empty placeholder; possible dead naming artifact or superseded concept — inference only, requires cleanup decision. |

Also skeleton on the frontend: `apps/web/src/components/shared/` is an empty directory.

## Not Started

| Capability | Evidence |
|---|---|
| Inventory / Stock Management | No model, module, route, or component found anywhere by name or by adjacent concept (stock, SKU, supply). |

## Other Notable Findings

- **`packages/shared`** exists (a small workspace package with generic pagination/role/status types) but is **not consumed** — confirmed zero imports of `@sdhp/shared` in either app, and it's not declared as a dependency in either `package.json`.
- **Two redirect-only stub pages**: `dashboard/settings/employees` and `dashboard/settings/staff` exist solely to forward old bookmarks to `dashboard/hr/employees` and `dashboard/hr/accounts` — confirmed by reading their content.

## Related

- [Modules.md](Modules.md) — what each module does
- [Feature-Matrix.md](Feature-Matrix.md) — feature-level detail per module
- [../00-Company/Product-Scope.md](../00-Company/Product-Scope.md) — how this inventory maps to current/near-term/strategic scope
