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
| **Prescription Templates** GET (list/:id) | ✓ | ✓ | | ✓ | | | | |
| **Prescription Templates** POST/PATCH/DELETE | ✓ | ✓ | | | | | | |
| **Medical Service Requests** GET (list/:id) | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Medical Service Requests** POST (request) / PATCH :id/cancel | ✓ | ✓ | | ✓ | | ✓ | | |
| **Medical Service Requests** PATCH :id/execute | ✓ | ✓ | | ✓ | ✓ | | | ✓ |
| **Medical Service Requests** POST :id/bill | ✓ | ✓ | | | | | ✓ | |
| **Medical Timeline** GET :patientId/timeline | ✓ | ✓ | | ✓ | ✓ | | | |
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

**Note — three rows added 2026-06-29 (Phase 0E-C38B), verified directly against their controllers:** `prescription-templates`, `medical-service-requests`, and `medical-timeline` were added during Phase 0E-C32/C32-adjacent work and had not yet been added to this matrix — a routine documentation lag, not a code defect (consistent with this project's established practice of not always updating this specific doc the same phase a module ships). Confirmed via direct `@Roles(` read of each controller at verification time; none of the three grant `BRANCH_ADMIN`.

**Notes (verified directly against `followups.controller.ts`):**
- `BRANCH_ADMIN` **is** a real, actively-granted role on the Follow-ups module — confirmed via direct read of `apps/api/src/modules/followups/followups.controller.ts`: every endpoint's `@Roles()` list includes `UserRole.BRANCH_ADMIN`. This corrects an earlier draft of this document that flagged BRANCH_ADMIN as unconfirmed.
- Follow-ups `GET` endpoints additionally allow `DOCTOR` (read own patients only, per controller `@ApiOperation` summary text); the reminder-mutation endpoints (`POST`/`PATCH`) explicitly **exclude** DOCTOR (per controller comment: "DOCTOR excluded").
- Reminder creation only queues a `PENDING` record — controller doc comment explicitly states "no actual sending" — confirming the note in [Modules.md](Modules.md) that delivery (SMS/WhatsApp/Email) is not implemented.
- Codebase-wide grep for `UserRole.BRANCH_ADMIN` (run directly, not sampled) found it in exactly 5 controllers: `followups`, `clinic-settings`, `doctor-schedules`, `services`, `visit-types`. In the latter four it only appears on the already-broad read endpoints (these are the "open to most roles" GET rows in this matrix). It does **not** appear in patients, appointments, encounters, billing, queue, or any other clinical/financial write path. BRANCH_ADMIN therefore has real but narrow backend reach today — mostly read access to reference data, plus full Follow-ups access.
- Re-confirmed independently, Phase 0E-C38B (2026-06-29): exhaustive `grep -rn "BRANCH_ADMIN" apps/api/src` returns exactly the 12 lines across those same 5 files — no drift since the above was last verified. On the frontend, `BRANCH_ADMIN` similarly appears in only `NAV_FOLLOW_UPS_ROLES`, `FOLLOW_UP_PAGE_ROLES`, and `NAV_PROFILE_ROLES` — consistent with the backend footprint. One asymmetry worth noting (not a bug): `NAV_SETTINGS_ROLES` is `ORG_ADMIN`-only, so BRANCH_ADMIN has no sidebar/UI path to the Clinic Settings / Doctor Schedules / Services / Visit Types screens its backend role grants read access to — the backend is broader than what the frontend currently surfaces, which is the safe direction (nothing is reachable through the UI that the backend wouldn't also allow), just an unused grant rather than a gap.

### BRANCH_ADMIN Scope Decision (Phase 0E-C38B, 2026-06-29)

Recorded as an explicit governance decision, not just a description of current state:

- **`BRANCH_ADMIN` is intentionally narrow today** — read access to a handful of reference/settings endpoints, plus full access to the Follow-ups module. It is **not** equivalent to `ORG_ADMIN` and must not be treated as a general-purpose admin role.
- **It must not be broadened silently.** Adding `UserRole.BRANCH_ADMIN` to a new `@Roles()` list (or a new frontend permission constant) as a side effect of unrelated work is exactly the kind of permission drift this document exists to catch — don't do it as a convenience fix.
- **Any future expansion of `BRANCH_ADMIN`** into clinical data (patients/encounters/prescriptions), billing, staff management, reports, or cross-branch operations requires its own explicit planning phase, and must change backend `@Roles()` and frontend permission constants together — never one without the other, consistent with how every other role boundary in this codebase is enforced in both layers.
- **Frontend permission constants remain a UX layer only.** `apps/web/src/lib/permissions.ts` is defense-in-depth / navigation convenience — `RolesGuard` + `@Roles()` on the backend is the actual security boundary, exactly as already stated in §3 above. Any review of `BRANCH_ADMIN` (or any role) must check the backend first; the frontend gate is not evidence of what's actually enforced.

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
| Reports (Summary/Appointments/Visits hub, Phase 0E-C39E/C40B) | ORG_ADMIN, DOCTOR |
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
| `REPORTS_SUMMARY_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
| `REPORTS_APPOINTMENTS_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
| `REPORTS_CLINICAL_ACCESS_ROLES` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
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
- ~~Whether `BRANCH_ADMIN` has any real backend enforcement anywhere beyond the open-to-all-authenticated default~~ — **resolved, Phase 0E-C38B (2026-06-29)**: yes, confirmed via direct, exhaustive grep against 5 specific controllers — see the BRANCH_ADMIN notes and Scope Decision above. This line was stale; the question had already been answered above it but the TODO wasn't removed at the time.
- New modules added after this matrix's last full pass should be checked against the module list in `apps/api/src/modules/*` periodically — three were found missing and added in Phase 0E-C38B (`prescription-templates`, `medical-service-requests`, `medical-timeline`); there is no automated check that keeps this document in sync with new controllers.

## 5. Audit Log Coverage — Account/Security Actions (Phase 0E-C38C, 2026-06-29)

Verified directly against `AuditLogsWriterService`, `auth.service.ts`, and `users.service.ts` — no code changed in this pass, documentation only.

**Architecture:** single `AuditLog` table; every write goes through `AuditLogsWriterService.log()`; `userId`/`organizationId` are always taken from the caller (actor and tenant context are structurally guaranteed, not optional per call site); audit action names are raw string literals, not a central enum; writes are best-effort and non-transactional with the primary action (a failed audit write is logged and swallowed, never rethrown); `ipAddress`/`userAgent` columns exist on the model but no call site currently populates them; read access (`GET /v1/audit-logs`) is `SUPER_ADMIN`-only — `ORG_ADMIN` cannot read its own organization's audit trail today.

**Covered actions:**

| Action | Audit action name | Notes |
|---|---|---|
| Self-service password change | `PASSWORD_CHANGED` | Never logs the password itself |
| Admin-created user/staff account | `USER_CREATED` | No before/after snapshot of assigned role/branch |
| Admin-updated user/staff account | `USER_UPDATED` | Fallback action when neither password nor role changed; no field snapshot |
| Role changes | `USER_ROLE_CHANGED` | Most fully instrumented — includes `oldData`/`newData` role values |
| Deactivation (dedicated Deactivate path) | `USER_DEACTIVATED` | Also covers soft-delete — same backend operation in this domain model |
| Reactivation/restore (dedicated Restore path) | `USER_ACTIVATED` | |
| Admin password reset | `PASSWORD_RESET_BY_ADMIN` | Never logs the temporary password |
| Login / Logout | `LOGIN` / `LOGOUT` | No IP/user-agent captured |

**Deferred gaps (documented, not fixed in this arc):**

| Gap | Priority | Why deferred |
|---|---|---|
| Failed login attempts are not logged at all | Medium | Partially mitigated by existing login rate-limiting; forensic gap, not a live exploit path |
| `isActive` toggled via the generic edit-form path (`PATCH /:id`) logs as generic `USER_UPDATED`, not a distinct activation/deactivation action — only the dedicated Deactivate/Restore buttons get the specific labels | Medium | Observability gap only; the last-active-admin protection guard is correctly duplicated and enforced on both paths |
| `USER_CREATED`/`USER_UPDATED` carry no before/after field snapshot | Low | Actor, target, org, and timestamp are always present; just thin detail |
| `ipAddress`/`userAgent` never populated despite schema support | Low | General gap, not account-specific |
| `ORG_ADMIN` has no audit-log read access | Informational | RBAC scope question, intentionally left for a separate future decision |

**Decision:** no code changes made for any of the above in this arc. Revisiting them is a separate, explicitly-scoped future phase, not an automatic follow-on.
