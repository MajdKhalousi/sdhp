# Permissions Matrix

> Compiled from `@Roles()` decorator usage across `apps/api/src/modules/*/*.controller.ts`, `apps/api/src/common/guards/roles.guard.ts`, and `apps/web/src/lib/permissions.ts`. This was assembled by an automated code search across ~30 controllers — cell values should be re-verified against the live controller before being treated as a compliance source of truth. Cells marked blank mean "no @Roles entry found granting this role access" — that is the search agent's read of the code, not a guarantee.

## 1. How Enforcement Works (Backend)

- `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`) is a **global** guard (`APP_GUARD`).
- If a controller method has **no `@Roles()` decorator**, it is open to **any authenticated user** (any of the 8 roles), not just specific ones.
- If `@Roles(...)` is present, **SUPER_ADMIN always passes**, regardless of whether `SUPER_ADMIN` is explicitly listed — confirmed as an early-return bypass in the guard.
- `@Public()` marks an endpoint as not requiring authentication at all (e.g. `POST /auth/login`).
- Tenant/org scoping is enforced **separately**, in the service layer — `RolesGuard` only answers "is this role allowed to call this endpoint at all," not "does this user have access to this specific record." A shared helper (`assertPatientLinkedToOrg`, in `common/helpers/`) and explicit `caller.organizationId` comparisons in services handle the latter.
- `SubscriptionGuard` (`@RequiresActiveSubscription()`) is an independent axis from role — it blocks writes for *any* role if the organization's SaaS subscription is inactive, on: appointments, encounters, queue, labs, radiology, billing (create/update paths). Not applied to employees/HR or medical-files.

## 2. Backend Role × Endpoint Matrix

Roles, abbreviated: **SA**=SUPER_ADMIN, **OA**=ORG_ADMIN, **BA**=BRANCH_ADMIN, **DR**=DOCTOR, **NU**=NURSE, **SE**=SECRETARY, **AC**=ACCOUNTANT, **TE**=TECHNICIAN.

| Module / Endpoint | SA | OA | BA | DR | NU | SE | AC | TE |
|---|---|---|---|---|---|---|---|---|
| **Auth** — login/me/password/logout (all open to authenticated users; login is `@Public()`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Patients** GET list/:id/check-duplicate | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | |
| **Patients** POST / PATCH | ✓ | ✓ | | | | ✓ | | |
| **Patients** DELETE | ✓ | ✓ | | | | | | |
| **Patients** link-request / verify-link / pending-links | ✓ | ✓ | | ✓ | ✓ | ✓ | | |
| **Appointments** GET | ✓ | ✓ | | ✓ | ✓ | ✓ | | |
| **Appointments** POST / PATCH | ✓ | ✓ | | | | ✓ | | |
| **Appointments** DELETE | ✓ | ✓ | | | | | | |
| **Encounters** GET | ✓ | ✓ | | ✓ | ✓ | ✓ | | |
| **Encounters** POST / PATCH | ✓ | ✓ | | ✓ | | | | |
| **Encounters** DELETE | ✓ | ✓ | | | | | | |
| **Queue** GET | ✓ | ✓ | | ✓ | ✓ | ✓ | | |
| **Queue** POST (check-in) | ✓ | ✓ | | | | ✓ | | |
| **Queue** PATCH :id/triage | ✓ | ✓ | | | ✓ | | | |
| **Queue** PATCH :id (advance status) | ✓ | ✓ | | ✓ | ✓ | | | |
| **Queue** DELETE | ✓ | ✓ | | | | | | |
| **Billing — Invoices** POST/PATCH/items | ✓ | ✓ | | | | (issue only) | ✓ | |
| **Billing — Invoices** GET | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | |
| **Billing — Invoices** PATCH :id/issue | ✓ | ✓ | | | | ✓ | ✓ | |
| **Billing — Invoices** cancel / payments / void | ✓ | ✓ | | | | (payments only) | ✓ | |
| **Billing Policy** GET/PATCH, outstanding-patients | ✓ | ✓ | | | | | | |
| **Patient Invoices/Outstanding-balance** (read) | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | |
| **Labs** POST (order) / PATCH review | ✓ | ✓ | | ✓ | | | | |
| **Labs** GET | ✓ | ✓ | | ✓ | ✓ | ✓ | | ✓ |
| **Labs** PATCH :id/status | ✓ | ✓ | | ✓ | ✓ | | | ✓ |
| **Labs** PATCH :id/result | ✓ | ✓ | | | | | | ✓ |
| **Labs** DELETE | ✓ | ✓ | | ✓ | | | | |
| **Radiology** — mirrors Labs (order/review = DOCTOR, status = DOCTOR+NURSE+TECH, report = TECH) | ✓ | ✓ | | ✓ | ✓ | ✓ | | ✓ |
| **Medical Files** upload/read | ✓ | ✓ | | ✓ | ✓ | ✓ | | ✓ |
| **Medical Files** PATCH/DELETE | ✓ | ✓ | | ✓ | | | | |
| **Clinical Reports** POST/PATCH/DELETE/save-as-file | ✓ | ✓ | | ✓ | | | | |
| **Clinical Reports** GET / PDF | ✓ | ✓ | | ✓ | ✓ | ✓ | | |
| **Allergies** GET/POST/PATCH | ✓ | ✓ | | ✓ | ✓ | | | |
| **Allergies** DELETE | ✓ | ✓ | | ✓ | | | | |
| **Prescriptions** all verbs | ✓ | ✓ | | ✓ | | | | |
| **Employees (HR)** GET | ✓ | ✓ | | | | | ✓ | |
| **Employees (HR)** POST/PATCH/DELETE/restore | ✓ | ✓ | | | | | | |
| **Employee Documents** all verbs (upload-url, register, list, download-url, delete) | ✓ | ✓ | | | | | | |
| **Doctor Schedules** GET (schedule/slots/exceptions) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Doctor Schedules** PUT/POST/PATCH/DELETE (write) | ✓ | ✓ | | | | | | |
| **Audit Logs** GET (list/:id) | ✓ | | | | | | | |
| **Reports** summary/appointments/clinical/queue | ✓ | ✓ | | ✓ | | | | |
| **Reports** billing | ✓ | ✓ | | | | | ✓ | |
| **Reports** cashier-summary | ✓ | ✓ | | | | ✓ | ✓ | |
| **Dashboard** overview | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Dashboard** today (Today Hub) | | ✓ | | ✓ | ✓ | ✓ | ✓ | |
| **Users** all verbs | ✓ | ✓ | | | | | | |
| **Doctors** GET | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | |
| **Doctors** POST/PATCH/DELETE | ✓ | ✓ | | | | | | |
| **Organizations** GET | ✓ | ✓ | | | | | | |
| **Organizations** POST / onboard / DELETE | ✓ | | | | | | | |
| **Organizations** PATCH | ✓ | ✓ | | | | | | |
| **Branches / Departments** all verbs | ✓ | ✓ | | | | | | |
| **Clinic Settings** GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Clinic Settings** PUT (write) | ✓ | ✓ | | | | | | |
| **Visit Types / Services** GET | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Visit Types / Services** POST/PATCH/DELETE | ✓ | ✓ | | | | | | |
| **Subscription Payments** all verbs | ✓ | | | | | | | |
| **Follow-ups** GET (list/summary) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| **Follow-ups** POST reminder / GET reminders / PATCH reminder status / PATCH response | ✓ | ✓ | ✓ | | ✓ | ✓ | | |

**Note — Billing/Invoices clinical-scope narrowing (Phase 154B, deployed and production-verified):** DOCTOR and NURSE remain technically allowed at the controller-role level on `GET /invoices` (and `:id`/`:id/pdf`) — the ✓ marks above are still accurate as a yes/no role check — because the doctor-queue and queue-board frontend screens legitimately depend on this endpoint for today's invoice-status badges. What changed is service-layer behavior the boolean matrix above can't show: DOCTOR's results are scoped to patients with appointments under their own doctor profile; NURSE's results are scoped to patients with appointments in their org/branch; both default to a today-only date window. Out-of-scope invoice detail/PDF access returns **404, not 403**, to avoid disclosing that the invoice exists at all. Billing roles (SUPER_ADMIN/ORG_ADMIN/ACCOUNTANT/SECRETARY) are unaffected.

**Notes (verified directly against `followups.controller.ts`):**
- `BRANCH_ADMIN` **is** a real, actively-granted role on the Follow-ups module — confirmed via direct read of `apps/api/src/modules/followups/followups.controller.ts`: every endpoint's `@Roles()` list includes `UserRole.BRANCH_ADMIN`. This corrects an earlier draft of this document that flagged BRANCH_ADMIN as unconfirmed.
- Follow-ups `GET` endpoints additionally allow `DOCTOR` (read own patients only, per controller `@ApiOperation` summary text); the reminder-mutation endpoints (`POST`/`PATCH`) explicitly **exclude** DOCTOR (per controller comment: "DOCTOR excluded").
- Reminder creation only queues a `PENDING` record — controller doc comment explicitly states "no actual sending" — confirming the note in [Modules.md](Modules.md) that delivery (SMS/WhatsApp/Email) is not implemented.
- Codebase-wide grep for `UserRole.BRANCH_ADMIN` (run directly, not sampled) found it in exactly 5 controllers: `followups`, `clinic-settings`, `doctor-schedules`, `services`, `visit-types`. In the latter four it only appears on the already-broad read endpoints (these are the "open to most roles" GET rows in this matrix). It does **not** appear in patients, appointments, encounters, billing, queue, or any other clinical/financial write path. BRANCH_ADMIN therefore has real but narrow backend reach today — mostly read access to reference data, plus full Follow-ups access.

## 3. Frontend Permission Constants (`apps/web/src/lib/permissions.ts`)

The frontend re-implements its own role gating (navigation visibility, page guards, action-button gates) — this is a **UX/defense-in-depth layer**, not the security boundary; the backend matrix above is authoritative for actual access control.

### Navigation visibility (sidebar items, array-based `.includes(role)`)

| Nav item | Roles |
|---|---|
| Dashboard | ORG_ADMIN, DOCTOR, NURSE, SECRETARY, ACCOUNTANT, TECHNICIAN |
| Today | ORG_ADMIN, SECRETARY, DOCTOR, NURSE, ACCOUNTANT |
| Patients | ORG_ADMIN, DOCTOR, NURSE, SECRETARY, ACCOUNTANT |
| Appointments | ORG_ADMIN, DOCTOR, NURSE, SECRETARY |
| Queue | ORG_ADMIN, NURSE, SECRETARY |
| Doctor Workspace / Doctor Queue | ORG_ADMIN, DOCTOR |
| My Follow-ups | DOCTOR only |
| Technician Labs / Radiology | ORG_ADMIN, TECHNICIAN |
| Follow-ups (org-wide) | ORG_ADMIN, BRANCH_ADMIN, NURSE, SECRETARY |
| Cashier / Invoices | ORG_ADMIN, ACCOUNTANT, SECRETARY |
| Billing Reports | ORG_ADMIN, ACCOUNTANT |
| Doctors (management) | ORG_ADMIN only |
| HR / Settings | ORG_ADMIN only |
| Platform (Overview/Organizations/Payments/Audit Logs/Users) | SUPER_ADMIN only |
| Profile | all roles |

### Page-level access sets (Set-based `.has(role)`)

| Constant | Roles |
|---|---|
| `BILLING_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN, ACCOUNTANT, SECRETARY |
| `INVOICE_READ_ROLES` | SUPER_ADMIN, ORG_ADMIN, ACCOUNTANT, SECRETARY, DOCTOR |
| `DOCTOR_WORKSPACE_ROLES` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
| `MY_FOLLOW_UPS_ROLES` | DOCTOR |
| `FOLLOW_UP_PAGE_ROLES` | SUPER_ADMIN, ORG_ADMIN, BRANCH_ADMIN, NURSE, SECRETARY |
| `SETTINGS_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN |
| `EMPLOYEES_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN |
| `TECHNICIAN_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN, TECHNICIAN |
| `PLATFORM_ACCESS_ROLES` | SUPER_ADMIN |
| `QUEUE_TRIAGE_ROLES` | SUPER_ADMIN, ORG_ADMIN, NURSE |

Plus narrower action-level gates per page: `PATIENT_EDIT_ROLES`, `PATIENT_ARCHIVE_ROLES`, `PATIENT_BOOK_ROLES`, `PATIENT_INVOICE_ROLES`, `APPOINTMENT_CREATE_ROLES`, `APPOINTMENT_MUTATE_ROLES`, `QUEUE_CREATE_ROLES`, `INVOICE_CREATE_ROLES`, `TODAY_BILLING_ROLES`, `TODAY_ENCOUNTER_ROLES`, `TODAY_ADVANCE_ROLES`, `DASHBOARD_*_ROLES`, `CLINICAL_ROLES`, `PATIENT_SAFETY_ALERT_ROLES`, `RECEPTION_ACTION_ROLES`.

### SUPER_ADMIN frontend containment

`SUPER_ADMIN_ALLOWED_PATH_PREFIXES = ['/dashboard/platform', '/dashboard/profile']`. A `PlatformOnlyGuard` component blocks SUPER_ADMIN from every clinic-operational route by default — new routes are auto-blocked for SUPER_ADMIN unless explicitly added to this allow-list. This is a deliberate inversion: on the backend, SUPER_ADMIN bypasses all role checks; on the frontend, SUPER_ADMIN is *more* restricted than other roles by default, confining them to platform-operator screens.

## 3a. Deliberate Exclusion: ACCOUNTANT and Employee Documents

Confirmed (audited 2026-06-21, [Architecture Audit Report.md](Architecture%20Audit%20Report.md) §6) by reading `employees-documents.controller.ts` directly: **ACCOUNTANT has zero access to Employee Documents**, despite having read access to `EmployeeProfile` itself elsewhere. This is a deliberate, in-code-commented decision — employee documents may include ID scans and contracts, which ACCOUNTANT does not need for payroll/salary purposes. Worth preserving as an explicit, intentional narrowing rather than an oversight if this module is ever refactored.

## 4. TODO / Unknown

- Full per-endpoint role lists for `followups`, and exact role lists for a handful of less-traveled endpoints (e.g. `medical-files` PATCH vs the read endpoints) were generated by pattern search rather than line-by-line confirmation — treat this matrix as a strong starting map, re-grep `@Roles(` in the specific controller before making an access-control decision based on it.
- Whether `BRANCH_ADMIN` has any real backend enforcement anywhere beyond the open-to-all-authenticated default.
