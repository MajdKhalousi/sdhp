# Backend Modules

> Source: `apps/api/src/modules/*` and `apps/api/src/app.module.ts`. Compiled from automated code exploration in this session — verify file paths before relying on exact line numbers. Mark anything uncertain as TODO/Unknown rather than assume.

All modules are registered in `apps/api/src/app.module.ts`. Route prefix for the whole API is `/api/v1` (confirmed via DEPLOY.md health-check URLs and audit-logs docs referencing `/api/v1/...`).

## Module Dependency Table

| Module | Imports (module-to-module) | Notes |
|---|---|---|
| `auth` | `AuditLogsModule`, `PassportModule`, `JwtModule` | Login by phone, JWT issuance |
| `users` | `AuditLogsModule` | Staff accounts (all roles) |
| `organizations` | `AuditLogsModule` | Tenant root; SUPER_ADMIN platform ops |
| `subscription-payments` | `AuditLogsModule` | Platform SaaS billing, SUPER_ADMIN only |
| `branches` | — | Org sub-units |
| `departments` | — | Org departments |
| `doctors` | — | Doctor profile, 1:1 with `User` |
| `doctor-schedules` | — (exported for `appointments` to consume) | Weekly availability + exceptions |
| `employees` | `AuditLogsModule`, `StorageModule`, `UsersModule` | HR core: profiles, documents, attendance, leave |
| `patients` | `AuditLogsModule`, `MedicalTimelineModule` | Patient records + cross-org linking |
| `allergies` | `AuditLogsModule` | Nested under patients |
| `appointments` | `MedicalTimelineModule`, `AuditLogsModule`, `DoctorSchedulesModule`, `BillingModule`, `SubscriptionAccessModule` | Booking + slot validation |
| `queue` | `AuditLogsModule`, `MedicalTimelineModule`, `BillingModule` | Check-in / ticketing / triage |
| `encounters` | `AuditLogsModule`, `MedicalTimelineModule` | Clinical visit record |
| `prescriptions` | `MedicalTimelineModule`, `AuditLogsModule` | Encounter-scoped |
| `labs` | `AuditLogsModule`, `MedicalTimelineModule` | Lab order workflow |
| `radiology` | `AuditLogsModule`, `MedicalTimelineModule` | Radiology order workflow |
| `medical-files` | `MedicalTimelineModule`, `StorageModule`, `AuditLogsModule` | Presigned-URL document store |
| `clinical-reports` | `MedicalTimelineModule`, `PdfModule`, `StorageModule` | DRAFT → FINALIZED narrative reports |
| `billing` | `AuditLogsModule`, `PdfModule` | Invoice/payment lifecycle |
| `visit-types` | `AuditLogsModule` | Catalog: consultation/follow-up/etc. |
| `services` | `AuditLogsModule` | Catalog: procedures + pricing |
| `clinic-settings` | — | Working hours, timezone, slot length |
| `reports` | — | Computed analytics (no own data) |
| `dashboard` | — | Aggregated "today" views |
| `followups` | — | Reminder scheduling off encounters |
| `audit-logs` | — | Self-contained; exports writer service to others |
| `medical-timeline` | — | Self-contained; exports writer service to others |
| `storage` | — | MinIO abstraction; self-contained |
| `pdf` | — | Puppeteer/Chromium rendering; self-contained |
| `notifications`, `staff`, `staff-scheduling`, `rooms`, `ai-assistant` | — | **Confirmed empty** (audited 2026-06-21) — each folder contains only `.gitkeep`, no `.module.ts`/`.controller.ts`/`.service.ts` files exist, and none are imported in `app.module.ts`. Not registered modules at all, despite the folder names suggesting otherwise. |

## Cross-Cutting / Infrastructure Modules

These are imported by domain modules rather than being domain concerns themselves:

- **`AuditLogsModule`** — exports `AuditLogsWriterService`. Read API (`GET /audit-logs`, `GET /audit-logs/:id`) is SUPER_ADMIN only.
- **`MedicalTimelineModule`** — exports `MedicalTimelineWriterService`. Read API is a per-patient aggregated, read-only event feed.
- **`StorageModule`** — exports `StorageService`, wraps MinIO presigned URL generation/use.
- **`PdfModule`** — exports `PdfService`, shared HTML→PDF rendering helper used for invoices and clinical reports.
- **`common/subscription` (`SubscriptionAccessModule`)** — provides the `@RequiresActiveSubscription()` decorator + `SubscriptionGuard`, registered globally. Blocks **write** operations on appointments, encounters, queue, labs, radiology, and billing when an organization's subscription is not active. **Deliberately not applied** to `employees` (HR) or `medical-files`.

## Module Detail by Domain

### Auth
- Route prefix `/auth`. Endpoints: `POST /auth/login` (`@Public()`), `GET /auth/me`, `PATCH /auth/me/password`, `POST /auth/logout`.
- Strategy: JWT via `@nestjs/passport`. Login identifier is **phone**, not email. Token field returned is `accessToken`.
- `logout()` is fire-and-forget audit-logged; no server-side token revocation confirmed (see System Architecture §9 — Redis denylist planned, not yet implemented per project memory).

### Organizations (Platform / Super Admin)
- Route prefix `/organizations`. SUPER_ADMIN can `POST /organizations`, `POST /organizations/onboard` (atomic org + branch + ORG_ADMIN creation), `DELETE /organizations/:id` (soft delete). ORG_ADMIN can read/update their own org.
- `Organization.subscriptionStatus/subscriptionPlan/subscriptionStartAt/subscriptionEndAt/subscriptionNotes` are manual, independent fields — **not** auto-updated by recording a `SubscriptionPayment` (explicit design decision, documented in a schema comment).

### Subscription Payments (Platform / Super Admin)
- Route prefix `/organizations/:organizationId/subscription-payments`. SUPER_ADMIN only, all verbs. Platform-level SaaS billing history, deliberately decoupled from clinic patient billing (`Invoice`/`Payment`).

### Users
- Route prefix `/users`. SUPER_ADMIN (all orgs) and ORG_ADMIN (own org, cannot create another SUPER_ADMIN) manage staff accounts. Soft delete + `PATCH /users/:id/restore`. `passwordHash` and `deletedAt` are excluded at the Prisma `select` level in every query (never post-filtered).

### Branches / Departments / Doctors
- Standard CRUD, org-scoped, SUPER_ADMIN + ORG_ADMIN write access; broader read access for operational roles (varies — see [Permissions Matrix.md](Permissions%20Matrix.md)).
- `Doctor` has no direct `organizationId` column — tenant filtering for doctors goes through `doctor.user.organizationId`.

### Doctor Schedules
- Route prefix `/doctors/:doctorId/schedule` (+ `/available-slots`, `/schedule/exceptions`). Weekly recurring hours (`DoctorSchedule`) plus date-specific exceptions (`DoctorScheduleException`: HOLIDAY / LEAVE / CUSTOM_HOURS). Consumed by `appointments` for slot-availability validation before booking.

### Employees / HR
- `EmployeesModule` is the HR core, covering four sub-areas via separate controllers: `EmployeesController` (profiles), `EmployeeDocumentsController` (documents — **upload IS implemented**, confirmed by reading `employees-documents.controller.ts` directly: `POST /employees/:employeeProfileId/documents/upload-url` (presigned URL), `POST .../documents` (register metadata), `GET .../documents`, `GET .../documents/:documentId/download-url`, `DELETE .../documents/:documentId`, all SUPER_ADMIN/ORG_ADMIN only, ACCOUNTANT deliberately excluded per an in-code comment since documents may include ID scans/contracts. The `schema.prisma` comment calling this "foundation only — no upload endpoint yet" is **stale** — the feature was built after that comment was written and the comment was never updated), `AttendanceController`/`DailyAttendanceController`, `LeaveController`/`LeaveQueueController`.
- `EmployeeProfile` is intentionally decoupled from `User`: HR-only staff can exist with no login (`userId` nullable+unique), and login-only accounts (e.g. SUPER_ADMIN) need no `EmployeeProfile`.
- `AttendanceRecord` is one row per employee per calendar date, manually entered by ORG_ADMIN (no biometric/device integration confirmed). `organizationId` is denormalized onto both `AttendanceRecord` and `LeaveRequest`, always derived server-side from the linked `EmployeeProfile` — never trusted from client input (explicit schema comments on both models).
- Approving a `LeaveRequest` does **not** automatically update `EmployeeProfile.employmentStatus` — kept as a deliberately separate manual control (schema comment).
- Not gated by `SubscriptionGuard` — HR access continues even if a clinic's SaaS subscription lapses.

### Patients
- Route prefix `/patients`. Includes a cross-organization linking feature: `GET /patients/check-duplicate`, `GET /patients/platform-candidates`, `GET /patients/pending-links`, `POST /patients/link-request`, `POST /patients/verify-link` (6-digit code), `DELETE /patients/pending-links/:id`. This implements the "patient becomes platform-level identity, ClinicPatient becomes the clinic relationship" model from project history (Phase 126).
- MRN auto-generated, unique per `(organizationId, mrn)`.

### Allergies
- Nested under `/patients/:patientId/allergies`. Simple CRUD; hard delete confirmed in project history (one of the few hard-deleted entities — most other tables use `deletedAt` soft delete).

### Appointments
- Route prefix `/appointments`. Status machine: `SCHEDULED → CONFIRMED → CHECKED_IN → IN_QUEUE → IN_PROGRESS → COMPLETED`, with `CANCELLED`/`NO_SHOW` side states. Double-booking prevention and slot validation against `DoctorSchedules` confirmed in project history.
- Gated by `@RequiresActiveSubscription()` on create/update.

### Queue
- Route prefix `/queue`. `QueueEntry` is 1:1 with `Appointment` (`appointmentId @unique`). Daily ticket numbering resets per `businessDate` (Asia/Damascus). Status: `WAITING → CALLED → IN_PROGRESS → DONE` (or `SKIPPED`). `PATCH /queue/:id/triage` records nurse-entered vitals (`triageVitals` JSON) and a chief-complaint draft, which prefill the subsequent `Encounter` if its own fields are omitted.

### Encounters
- Route prefix `/encounters`. Creation is **idempotent** by `appointmentId` — re-opening an in-progress visit returns the existing encounter rather than creating a duplicate (with a `P2002` unique-constraint catch as a race-condition backstop, per project history).
- Holds the clinical record: chief complaint, HPI, vitals (JSON), diagnosis (+ ICD code), treatment plan, patient instructions, follow-up date.

### Prescriptions
- Route prefix `/prescriptions`, scoped through `encounterId`. DOCTOR can delete only during an active encounter, with ownership check (per project history).

### Labs / Radiology
- Mirror each other structurally. `LabOrder`/`RadiologyOrder` status workflows: Labs `ORDERED → SAMPLE_COLLECTED → IN_PROGRESS → RESULTED → REVIEWED`; Radiology the same but `SCHEDULED` instead of `SAMPLE_COLLECTED`. Each has a 1:1 result/report child (`LabResult`, `RadiologyReport`) and a `/patients/:patientId/...` read-only sub-route.
- Role split (confirmed in code): DOCTOR creates and reviews; NURSE/TECHNICIAN handle the operational status transitions (sample collection / scheduling, result/report entry).

### Medical Files
- Route prefix `/medical-files` + `/patients/:patientId/medical-files`. Upload flow is presigned-URL based: `POST /medical-files/upload-url` → client uploads directly to MinIO → `POST /medical-files` registers metadata. `uploadedById` references `User` (not `Doctor`) — any role can upload. Metadata-only in the DB; bytes live in MinIO.

### Clinical Reports
- Route prefix `/clinical-reports` + `/patients/:patientId/clinical-reports`. `DRAFT` reports are editable; once `FINALIZED` they are immutable. `GET :id/pdf` renders via the shared `PdfModule`; `POST :id/save-as-file` persists the rendered PDF as a permanent `MedicalFile`.

### Billing
- Three controllers: `BillingController` (`/invoices` — CRUD, items, issue, cancel, payments, payment void, PDF download), `BillingPolicyController` (`/billing/policy`, `/billing/outstanding-patients`), `PatientInvoicesController` (`/patients/:patientId/invoices`, `/outstanding-balance`).
- Invoice lifecycle: `DRAFT → ISSUED → PARTIALLY_PAID → PAID` or `CANCELLED`. Items addable/removable only while `DRAFT`; subtotal/total recomputed atomically via `$transaction`. `invoiceNumber` auto-generated per org as `INV-YYYY-NNNNN` with a unique-constraint race guard (409 on collision).
- `BillingPolicy` (1:1 per org) configures `autoCreateInvoiceOnCheckin`, follow-up discount window, `requirePaymentBeforeEncounter`, no-show fee, invoice numbering prefix/sequence.
- No `DELETE /invoices` endpoint — `CANCELLED` status is the only user-facing removal path.

### Visit Types / Services (Catalogs)
- `VisitType` (consultation/follow-up/emergency/procedure/free-visit, with duration + base price) and `Service` (named procedures with department + default price) are org-scoped reference catalogs feeding `Appointment.visitTypeId` and `InvoiceItem.visitTypeId`/`serviceId` respectively. Write access restricted to SUPER_ADMIN/ORG_ADMIN; read open to most operational roles.

### Clinic Settings
- Route prefix `/clinic-settings`. Singleton per org (`organizationId @unique`): default slot length, lunch window, timezone (default `Asia/Damascus`), plus a child `ClinicWorkingDay[]` (per-day open/close, cascade-deleted with the parent).

### Reports / Dashboard
- `reports`: computed analytics only, no owned tables — `GET /reports/{summary,appointments,clinical,queue,billing,cashier-summary}`. SUPER_ADMIN sees cross-org; others scoped to own org. `cashier-summary` is timezone-aware (hardcoded Asia/Damascus UTC+3 offset).
- `dashboard`: `GET /dashboard/overview` (today-scoped operational metrics) and `GET /dashboard/today` ("Today Hub" — consolidated per-visit rows joining appointment + patient + doctor + queue + latest encounter + invoice). DOCTOR responses are filtered to their own patients.

### Followups
- Route prefix `/follow-ups`. Reminders (`FollowUpReminder`) are scheduled against an `Encounter`, optionally linked to a follow-up `Appointment`. Status: `PENDING → SENT/FAILED/CANCELLED`; records `patientResponse` (CONFIRMED/NO_RESPONSE/DECLINED/RESCHEDULE_REQUESTED) and an optional contact note. **No actual sending mechanism (SMS/WhatsApp/Email) was confirmed as implemented** — the `ReminderChannel` enum includes those values but the module appears to only queue/track reminder state, not dispatch them. TODO/Unknown — verify before assuming reminders are actually delivered.

## Empty / Stub Modules — confirmed by direct audit (2026-06-21)

`notifications`, `staff`, `staff-scheduling`, `rooms`, `ai-assistant` were each individually listed (`find <folder> -type f`) and contain **only a `.gitkeep` file** — no `.module.ts`, `.controller.ts`, or `.service.ts`. None are imported in `apps/api/src/app.module.ts` (grepped directly — zero matches). This is a confirmed current finding, not carried forward from a prior session's report. Project memory's Phase R1 note that `notifications` was empty as of 2026-05-30 is still accurate today; the same is now confirmed true for the other four. Staff scheduling and account management instead live inside `EmployeesModule` (HR: attendance + leave) and `UsersModule` (login accounts) respectively. Full audit trail in [Architecture Audit Report.md](Architecture%20Audit%20Report.md).
