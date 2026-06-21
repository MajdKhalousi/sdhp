# API Map

> All routes are versioned and mounted under `/api/v1`. Compiled from controller route decorators across `apps/api/src/modules/*`. This is an endpoint inventory for navigation purposes — for role grants per endpoint see [Permissions Matrix.md](Permissions%20Matrix.md); for request/response field detail, read the controller/DTO directly or `/api/docs` (Swagger, **disabled in production** — returns 404 when `NODE_ENV=production`, confirmed in `main.ts`).

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `@Public()`. Login by **phone**, not email. Rate-limited at nginx (`auth` zone, 10/min) in prod. |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me/password` | Self-service password change |
| POST | `/auth/logout` | Audit-logged; no confirmed server-side token revocation (see System Architecture §9) |

## Organizations (Platform)
| Method | Path | Notes |
|---|---|---|
| GET | `/organizations` | SA: all, OA: own |
| GET | `/organizations/:id` | |
| POST | `/organizations` | SUPER_ADMIN only |
| POST | `/organizations/onboard` | SUPER_ADMIN only — atomic org+branch+ORG_ADMIN creation |
| PATCH | `/organizations/:id` | |
| DELETE | `/organizations/:id` | SUPER_ADMIN only, soft delete |

## Subscription Payments (Platform)
| Method | Path | Notes |
|---|---|---|
| GET/POST/PATCH/DELETE | `/organizations/:organizationId/subscription-payments[/:paymentId]` | SUPER_ADMIN only. Platform SaaS billing, separate from clinic billing. |

## Users
| Method | Path | Notes |
|---|---|---|
| GET | `/users`, `/users/:id` | SA/OA |
| POST | `/users` | SA/OA |
| PATCH | `/users/:id` | SA/OA |
| PATCH | `/users/:id/restore` | SA/OA |
| DELETE | `/users/:id` | SA/OA, soft delete |

## Branches / Departments / Doctors
| Method | Path | Notes |
|---|---|---|
| GET/POST/PATCH/DELETE | `/branches[/:id]` | SA/OA write |
| GET/POST/PATCH/DELETE | `/departments[/:id]` | SA/OA write |
| GET/POST/PATCH/DELETE | `/doctors[/:id]` | SA/OA write; broader read |

## Doctor Schedules
| Method | Path | Notes |
|---|---|---|
| GET | `/doctors/:doctorId/schedule` | Open to all authenticated roles |
| PUT | `/doctors/:doctorId/schedule` | SA/OA — replaces whole weekly schedule |
| GET | `/doctors/:doctorId/available-slots` | Open to all authenticated roles, query by date |
| GET | `/doctors/:doctorId/schedule/exceptions` | Open to all authenticated roles |
| POST/PATCH/DELETE | `/doctors/:doctorId/schedule/exceptions[/:exceptionId]` | SA/OA |

## Employees (HR)
| Method | Path | Notes |
|---|---|---|
| GET | `/employees`, `/employees/:id` | SA/OA/AC |
| POST/PATCH | `/employees[/:id]` | SA/OA |
| PATCH | `/employees/:id/restore` | SA/OA |
| DELETE | `/employees/:id` | SA/OA |
| GET/POST/PATCH | `/employees/:employeeProfileId/attendance` | Per-employee attendance CRUD (`attendance.controller.ts`) |
| GET | `/attendance` | Org-wide/daily attendance list (second controller in same file) |
| POST | `/employees/:employeeProfileId/documents/upload-url` | Presigned upload URL — SUPER_ADMIN/ORG_ADMIN only. **Confirmed implemented** (audited 2026-06-21) — the schema comment calling this "foundation only" is stale. |
| POST | `/employees/:employeeProfileId/documents` | Registers document metadata post-upload — SUPER_ADMIN/ORG_ADMIN only |
| GET | `/employees/:employeeProfileId/documents` | List non-deleted documents — SUPER_ADMIN/ORG_ADMIN only |
| GET | `/employees/:employeeProfileId/documents/:documentId/download-url` | Presigned download URL — SUPER_ADMIN/ORG_ADMIN only |
| DELETE | `/employees/:employeeProfileId/documents/:documentId` | Soft delete (storage object retained) — SUPER_ADMIN/ORG_ADMIN only. ACCOUNTANT deliberately excluded from all document routes (may contain ID scans/contracts). |
| GET/POST/PATCH | `/employees/:employeeProfileId/leave-requests` | Per-employee leave requests (`leave.controller.ts`) |
| GET/PATCH | `/leave-requests` | Org-wide leave queue (second controller in same file, for approvals) |

## Patients
| Method | Path | Notes |
|---|---|---|
| GET | `/patients` | Org-scoped (SA: all) |
| GET | `/patients/check-duplicate` | Pre-create duplicate check |
| GET | `/patients/platform-candidates` | Cross-org linking candidates |
| GET | `/patients/pending-links` | Pending cross-org link requests |
| GET | `/patients/:id` | |
| POST | `/patients` | Auto-generates MRN |
| PATCH | `/patients/:id` | |
| DELETE | `/patients/:id` | Soft delete |
| POST | `/patients/link-request` | Initiates cross-org link, returns 6-digit code |
| POST | `/patients/verify-link` | Verifies code, activates link |
| DELETE | `/patients/pending-links/:id` | Cancels pending link |

## Allergies
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/patients/:patientId/allergies` | |
| PATCH/DELETE | `/patients/:patientId/allergies/:id` | |

## Appointments
| Method | Path | Notes |
|---|---|---|
| GET | `/appointments`, `/appointments/:id` | |
| POST | `/appointments` | `@RequiresActiveSubscription()` |
| PATCH | `/appointments/:id` | `@RequiresActiveSubscription()` |
| DELETE | `/appointments/:id` | Soft delete |

## Queue
| Method | Path | Notes |
|---|---|---|
| GET | `/queue`, `/queue/:id` | |
| POST | `/queue` | Check-in from appointment; auto ticket number |
| PATCH | `/queue/:id/triage` | Nurse-entered vitals + chief-complaint draft |
| PATCH | `/queue/:id` | Status advance (WAITING→CALLED→DONE) |
| DELETE | `/queue/:id` | |

## Encounters
| Method | Path | Notes |
|---|---|---|
| GET | `/encounters`, `/encounters/:id` | |
| POST | `/encounters` | Idempotent by `appointmentId`. `@RequiresActiveSubscription()` |
| PATCH | `/encounters/:id` | `@RequiresActiveSubscription()` |
| DELETE | `/encounters/:id` | Soft delete; not available to DOCTOR |

## Prescriptions
| Method | Path | Notes |
|---|---|---|
| GET | `/prescriptions`, `/prescriptions/:id` | |
| POST/PATCH/DELETE | `/prescriptions[/:id]` | Scoped via `encounterId`; DOCTOR delete restricted to own active encounter |

## Labs
| Method | Path | Notes |
|---|---|---|
| POST | `/lab-orders` | DOCTOR. `@RequiresActiveSubscription()` |
| GET | `/lab-orders`, `/lab-orders/:id` | |
| PATCH | `/lab-orders/:id/status` | DOCTOR/NURSE/TECHNICIAN |
| PATCH | `/lab-orders/:id/result` | TECHNICIAN |
| PATCH | `/lab-orders/:id/review` | DOCTOR |
| DELETE | `/lab-orders/:id` | |
| GET | `/patients/:patientId/lab-orders` | |

## Radiology
| Method | Path | Notes |
|---|---|---|
| POST | `/radiology-orders` | DOCTOR. `@RequiresActiveSubscription()` |
| GET | `/radiology-orders`, `/radiology-orders/:id` | |
| PATCH | `/radiology-orders/:id/status` | DOCTOR/NURSE/TECHNICIAN |
| PATCH | `/radiology-orders/:id/report` | TECHNICIAN |
| PATCH | `/radiology-orders/:id/review` | DOCTOR |
| DELETE | `/radiology-orders/:id` | |
| GET | `/patients/:patientId/radiology-orders` | |

## Medical Files
| Method | Path | Notes |
|---|---|---|
| POST | `/medical-files/upload-url` | Returns presigned PUT URL |
| POST | `/medical-files` | Registers metadata post-upload |
| GET | `/medical-files`, `/medical-files/:id` | |
| GET | `/medical-files/:id/download-url` | Presigned GET URL |
| GET | `/medical-files/:id/download` | Streamed download |
| PATCH/DELETE | `/medical-files/:id` | |
| GET | `/patients/:patientId/medical-files` | |

## Clinical Reports
| Method | Path | Notes |
|---|---|---|
| POST | `/clinical-reports` | Creates DRAFT |
| GET | `/clinical-reports`, `/clinical-reports/:id` | |
| GET | `/clinical-reports/:id/pdf` | Puppeteer/Chromium render |
| POST | `/clinical-reports/:id/save-as-file` | Persists rendered PDF as a MedicalFile |
| PATCH | `/clinical-reports/:id` | DRAFT only |
| DELETE | `/clinical-reports/:id` | |
| GET | `/patients/:patientId/clinical-reports` | |

## Billing
| Method | Path | Notes |
|---|---|---|
| POST | `/invoices` | Creates DRAFT |
| GET | `/invoices`, `/invoices/:id` | |
| GET | `/invoices/:id/pdf` | Puppeteer/Chromium render |
| PATCH | `/invoices/:id` | DRAFT only |
| POST | `/invoices/:id/items` | DRAFT only |
| DELETE | `/invoices/:id/items/:itemId` | DRAFT only |
| PATCH | `/invoices/:id/issue` | DRAFT→ISSUED, requires ≥1 item |
| PATCH | `/invoices/:id/cancel` | |
| POST | `/invoices/:id/payments` | |
| POST | `/invoices/:id/payments/:paymentId/void` | |
| GET/PATCH | `/billing/policy` | Auto-creates default on first GET |
| GET | `/billing/outstanding-patients` | Paginated |
| GET | `/patients/:patientId/invoices` | |
| GET | `/patients/:patientId/outstanding-balance` | |

## Visit Types / Services (Catalogs)
| Method | Path | Notes |
|---|---|---|
| GET | `/visit-types`, `/services` | Open to all authenticated roles |
| POST/PATCH/DELETE | `/visit-types[/:id]`, `/services[/:id]` | SA/OA |

## Clinic Settings
| Method | Path | Notes |
|---|---|---|
| GET | `/clinic-settings` | Open to all authenticated roles |
| PUT | `/clinic-settings` | SA/OA |
| PUT | `/clinic-settings/working-days` | SA/OA, replaces all working-day rows |

## Reports
| Method | Path | Notes |
|---|---|---|
| GET | `/reports/summary` | |
| GET | `/reports/appointments` | |
| GET | `/reports/clinical` | |
| GET | `/reports/queue` | |
| GET | `/reports/billing` | |
| GET | `/reports/cashier-summary` | `?date=YYYY-MM-DD`, Asia/Damascus timezone hardcoded |

## Dashboard
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/overview` | Today-scoped operational metrics |
| GET | `/dashboard/today` | "Today Hub" — consolidated visit rows |

## Follow-ups
| Method | Path | Notes |
|---|---|---|
| GET | `/follow-ups` | computed status; DOCTOR sees own patients only |
| GET | `/follow-ups/summary` | counts per status bucket |
| POST | `/follow-ups/:encounterId/reminders` | queues reminder — **does not send** |
| GET | `/follow-ups/:encounterId/reminders` | |
| PATCH | `/follow-ups/:encounterId/reminders/:reminderId` | status → SENT/FAILED |
| PATCH | `/follow-ups/:encounterId/reminders/:reminderId/response` | records patient response; DOCTOR excluded |

## Audit Logs
| Method | Path | Notes |
|---|---|---|
| GET | `/audit-logs` | SUPER_ADMIN only |
| GET | `/audit-logs/:id` | SUPER_ADMIN only |

## Empty / Unimplemented Surfaces

No routes exist for: `notifications`, `staff`, `staff-scheduling`, `rooms`, `ai-assistant` — **confirmed by direct audit, 2026-06-21**: each folder under `apps/api/src/modules/` contains only `.gitkeep`, no controller files exist to define routes from, and none are imported in `app.module.ts`. See [Architecture Audit Report.md](Architecture%20Audit%20Report.md) §2-5.

## TODO / Unknown

- Exact route prefixes/paths inside `EmployeesModule`'s sub-controllers (documents, attendance, leave) were not individually enumerated in this pass.
- DTO-level request/response shapes are intentionally omitted here — see Swagger (non-prod) or DTOs in each module's `dto/` folder.
