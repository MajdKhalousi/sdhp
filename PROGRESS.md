# SDHP API — Build Progress

_Last updated: 2026-05-18_

---

## Completed Modules (Backend Only)

| # | Module | Endpoints | Tests | Status |
|---|--------|-----------|-------|--------|
| 1 | **Auth** | POST /auth/login, GET /auth/me | — | ✅ Complete |
| 2 | **Organizations** | CRUD /organizations | — | ✅ Complete |
| 3 | **Branches** | CRUD /branches | 12/12 | ✅ Complete |
| 4 | **Departments** | CRUD /departments | 13/13 | ✅ Complete |
| 5 | **Users** | CRUD /users | 18/18 | ✅ Complete |
| 6 | **Doctors** | CRUD /doctors | 18/18 | ✅ Complete |
| 7 | **Patients** | CRUD /patients | 19/19 | ✅ Complete |
| 8 | **Appointments** | CRUD /appointments | 20/20 | ✅ Complete |
| 9 | **Queue** | CRUD /queue | 22/22 | ✅ Complete |
| 10 | **Encounters** | CRUD /encounters | 24/24 | ✅ Complete |

**Total: 10 backend modules, 146 test scenarios — all passing.**

---

## Last Thing Built

**Encounters module** — clinical encounter management tied to appointments and queue entries.

Key features:
- DOCTOR role enforcement: can only create/update encounters for their own doctor profile
- Atomic transaction on create: sets Appointment → `IN_PROGRESS` and QueueEntry → `IN_PROGRESS`
- `vitals` stored as Prisma `Json?` field
- `appointmentId` is `@unique` — DB-enforced one encounter per appointment (returns 409 on duplicate)
- Soft delete (`deletedAt`) — DOCTOR excluded from DELETE route
- `organizationId`, `patientId`, `doctorId`, `appointmentId` all excluded from UpdateDto (immutable after creation)

---

## What Comes Next

Remaining backend modules (in suggested order):

1. **Prescriptions** — link to encounter, prescribe medications with dosage/duration
2. **Medical Timeline** — unified chronological view of patient encounters, prescriptions, notes
3. **Labs / Radiology** — lab orders and results, radiology requests
4. **Reports** — aggregate reporting (org-level stats, appointment counts, etc.)
5. **Billing** — invoices linked to encounters/appointments
6. **Patient App** — patient-facing endpoints (view own records, book appointments)
7. **AI / Decision Support** — diagnosis suggestions, drug interactions (future)

Frontend (apps/web) has not been touched yet — all work is backend-only.

---

## Important Architectural Decisions

### Tenant Isolation
- All queries scoped by `organizationId` from JWT payload inside the **Service layer** (not just controller)
- `assertOwnership()` private method in each service throws 403 on cross-org access
- Doctor has no direct `organizationId` field — tenant isolation goes through `user.organizationId`

### Security
- `passwordHash` never included in any SELECT constant — excluded at query level, not filtered post-fetch
- `deletedAt` never exposed in responses
- Soft delete on all major entities except `QueueEntry` (no `deletedAt` field on that model)
- `forbidNonWhitelisted: true` on global ValidationPipe — sending excluded fields returns 400

### Role Hierarchy
- `SUPER_ADMIN` — bypasses all org checks, sees everything
- `ORG_ADMIN` — full CRUD within own org
- `DOCTOR` — read patients/appointments, create/update own encounters only, cannot delete encounters
- Lower roles (NURSE, SECRETARY, etc.) — no encounter/patient access by default

### Status Propagation Chain
```
Patient checks in → QueueEntry created → Appointment: CHECKED_IN
Doctor opens encounter → Encounter created → Appointment: IN_PROGRESS, QueueEntry: IN_PROGRESS
```

### DTO Immutability Pattern
Every UpdateDto uses `PartialType(OmitType(...))` to exclude fields that must not change after creation:
- `organizationId` — excluded from all update DTOs
- `patientId`, `doctorId`, `appointmentId` — excluded from Encounter UpdateDto
- `mrn` — excluded from Patient UpdateDto (immutable identifier)
- `userId` — excluded from Doctor UpdateDto

### API Structure
- Base path: `/api`, versioned as `/api/v1/...`
- Port: `3001` (configured via `API_PORT` env var)
- Swagger docs: `http://localhost:3001/api/docs`
- Login uses **phone number**, not email

### Seed Credentials
| Role | Phone | Password |
|------|-------|----------|
| SUPER_ADMIN | +963900000001 | password123 |
| ORG_ADMIN (org1) | +963912345678 | password123 |
| DOCTOR (org1) | +963912001001 | password123 (created during tests) |
