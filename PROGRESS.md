# SDHP API — Build Progress

_Last updated: 2026-05-19_

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
| 11 | **Prescriptions** | CRUD /prescriptions | 23/23 | ✅ Complete |
| 12 | **Medical Timeline** | GET /patients/:patientId/timeline | 12/12 | ✅ Complete |

**Total: 12 backend modules, 181 test scenarios — all passing.**

---

## Technical Handoff — Medical Timeline

### 1. Module Name
**Medical Timeline** — read-only computed patient history endpoint.

---

### 2. Goal
Expose a chronological view of a patient's medical history by aggregating existing
records (Appointments, QueueEntries, Encounters, Prescriptions) into a single sorted
event stream. No new database table, no migration, no writes.

---

### 3. Files Created

```
apps/api/src/modules/medical-timeline/
  medical-timeline.module.ts
  medical-timeline.service.ts
  medical-timeline.controller.ts
```

No DTOs — this module is read-only.

---

### 4. Files Modified

| File | Change |
|---|---|
| `apps/api/src/app.module.ts` | Added `MedicalTimelineModule` import and `imports` registration |
| `PROGRESS.md` | This file |

---

### 5. Endpoints Added

| Method | Route | Auth |
|---|---|---|
| `GET` | `/api/v1/patients/:patientId/timeline` | JWT required |

**No POST, PATCH, or DELETE.** This is a read-only aggregation endpoint.

The controller uses `@Controller('patients')` with `@Get(':patientId/timeline')`.
This is a 3-segment path and does **not** conflict with `PatientsController`'s
2-segment `@Get(':id')` route. NestJS and Express both resolve these correctly by
path depth before falling through to dynamic segments.

---

### 6. DTO Fields and Validation Rules

None. The endpoint accepts only a path parameter (`patientId`) and the caller's JWT.
There are no request bodies, no query params, no create/update DTOs.

---

### 7. Service Business Logic

**Entry point:** `getPatientTimeline(patientId: string, caller: JwtPayload): Promise<TimelineEvent[]>`

**Step 1 — Patient validation**
Fetches patient by `id` where `deletedAt: null`. Throws `NotFoundException` if missing.
Throws `ForbiddenException` if caller is not SUPER_ADMIN and
`patient.organizationId !== caller.organizationId`.

**Step 2 — Parallel data fetch via `Promise.all`**
Three queries run concurrently:
- `appointment.findMany({ where: { patientId, deletedAt: null } })` — includes nested `doctor`, `doctor.user`, and `queueEntry`
- `encounter.findMany({ where: { patientId, deletedAt: null } })` — includes nested `doctor` and `doctor.user`
- `prescription.findMany({ where: { encounter: { patientId }, deletedAt: null } })` — reached via relation filter since Prescription has no `patientId`

**Step 3 — Normalization**
Each source record is converted to a `TimelineEvent`:
```typescript
interface TimelineEvent {
  id: string;           // "TYPE-sourceId" — e.g. "ENCOUNTER-cuid"
  type: 'APPOINTMENT' | 'QUEUE' | 'ENCOUNTER' | 'PRESCRIPTION';
  date: string;         // ISO 8601
  title: string;
  description?: string;
  sourceId: string;     // the actual DB record ID
  source: Record<string, unknown>;  // sanitized source fields
}
```

Event date mapping:
- `APPOINTMENT` → `appointment.scheduledAt`
- `QUEUE` → `queueEntry.createdAt` (check-in time)
- `ENCOUNTER` → `encounter.startedAt`
- `PRESCRIPTION` → `prescription.createdAt`

Queue entries are produced as siblings of their parent appointment event, not nested inside it.

**Step 4 — Sort**
All events sorted by `date DESC` (newest first) at the application layer using
`Array.sort` with `Date` comparison. DB-level ordering is not relied upon.

---

### 8. Tenant Isolation Strategy

`Patient.organizationId` is the root ownership check.

- For SUPER_ADMIN: no org filter — patient lookup uses only `{ id, deletedAt: null }`.
- For all other roles: patient fetch checks `organizationId`, and if it does not match
  `caller.organizationId`, the service throws 403 before any sub-queries run.

The three sub-queries (appointments, encounters, prescriptions) are all scoped by
`patientId` which has already been org-validated. No additional org filter is needed
on the sub-queries because:
- Appointments belong to patients via `patientId` FK
- Encounters belong to patients via `patientId` FK
- Prescriptions are joined to patients through `encounter.patientId`

Isolation lives entirely inside `MedicalTimelineService`. The controller does nothing
except forward the call.

---

### 9. RBAC / Access Rules

| Role | GET timeline |
|---|---|
| SUPER_ADMIN | Any patient, any org |
| ORG_ADMIN | Own org patients only |
| DOCTOR | Own org patients only |
| NURSE / SECRETARY / ACCOUNTANT / TECHNICIAN | 403 |
| Unauthenticated | 401 |

DOCTOR is not restricted to their own patients — they can read any patient's timeline
within their organization. This is consistent with the read access model in
Appointments and Encounters (DOCTOR can read all org-scoped records, but can only
write to their own).

---

### 10. Prisma Schema Fields and Relations Used

**Patient** (ownership check)
- `id`, `organizationId`, `firstName`, `lastName`

**Appointment** (SELECT fields in response)
- `id`, `scheduledAt`, `durationMin`, `status`, `notes`, `cancelledAt`, `cancelReason`
- Relation: `doctor → Doctor → User`
- Relation: `queueEntry → QueueEntry`

**QueueEntry** (nested in Appointment, SELECT fields)
- `id`, `ticketNumber`, `status`, `calledAt`, `completedAt`, `createdAt`
- Note: QueueEntry has no `deletedAt` — it uses hard delete in the Queue module.
  Since appointments are filtered by `deletedAt: null`, orphaned queue entries
  cannot appear.

**Encounter** (SELECT fields)
- `id`, `appointmentId`, `chiefComplaint`, `notes`, `diagnosis`, `diagnosisCode`,
  `treatmentPlan`, `followUpDate`, `startedAt`, `endedAt`
- Relation: `doctor → Doctor → User`
- **`vitals` intentionally excluded** — it is a `Json?` field that could contain
  arbitrary clinical data not suitable for a summary timeline view.

**Prescription** (SELECT fields)
- `id`, `encounterId`, `medication`, `dosage`, `frequency`, `duration`,
  `instructions`, `quantity`, `refillsLeft`, `createdAt`
- Reached via relation filter: `{ encounter: { patientId } }`
  because Prescription has no direct `patientId` field.

**Doctor / User** (nested SELECT, same across all three queries)
```
Doctor: id, specialization
User:   id, firstName, lastName, phone, email, role, isActive
```

---

### 11. Soft Delete / Hard Delete Behavior

This module performs **no deletes** of any kind.

For filtering:
- `Appointment`, `Encounter`, `Prescription`, `Patient` all have `deletedAt` —
  filtered with `deletedAt: null` in every query.
- `QueueEntry` has **no `deletedAt`** field. It uses hard delete in the Queue module.
  This is safe here because a QueueEntry can only exist if its parent Appointment
  exists (FK constraint), and Appointments are already filtered by `deletedAt: null`.

---

### 12. Security Decisions

**`passwordHash` excluded at SELECT level**
The `User` SELECT constant does not include `passwordHash`. It is never fetched from
the database, not stripped post-fetch. Applies to all three nested doctor.user selects.

**`deletedAt` excluded at SELECT level**
Not in any SELECT constant. Never appears in responses.

**`vitals` excluded intentionally**
The `Encounter.vitals` field is `Json?` and can contain arbitrary clinical data
(blood pressure, weight, custom device readings). Exposing raw JSON in a summary
timeline is unpredictable. It is excluded from `ENCOUNTER_SELECT`. If a frontend
needs vitals detail, it should call `GET /encounters/:id` directly.

**Composite event IDs**
Timeline event `id` values use the format `"TYPE-sourceId"` (e.g.
`"ENCOUNTER-cmpbimra5..."`). These are computed strings, not DB IDs. They are
stable and unique within a patient's timeline but are not stored anywhere and
cannot be used with other endpoints.

**No write surface**
There is no POST, PATCH, or DELETE endpoint. The module cannot be used to create,
modify, or remove any data. The attack surface is limited to read access gated by
JWT and role checks.

---

### 13. Workflow Rules Implemented

1. Patient must exist and not be soft-deleted before any aggregation runs.
2. Org ownership check happens before any sub-queries — early exit on 403.
3. All three sub-queries run in parallel (`Promise.all`) — no sequential waterfall.
4. Queue events are produced from queue entries nested inside their parent appointment.
   A queue event only appears if the appointment has a linked `QueueEntry`.
5. Prescriptions are scoped through encounter → patient, not through a direct
   `patientId` field (which does not exist on `Prescription`).
6. All events sorted by date DESC in application memory after aggregation.
7. Descriptions are populated from the most clinically relevant field per type:
   - APPOINTMENT: `notes`
   - QUEUE: none
   - ENCOUNTER: `diagnosis` first, then `notes` as fallback
   - PRESCRIPTION: `dosage`, `frequency`, `duration` joined with ", "

---

### 14. Test Results (12/12 PASS)

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | SUPER_ADMIN reads org1 patient timeline | Events from org1 | 9 events, all 4 types ✓ |
| 2 | SUPER_ADMIN reads org2 patient timeline | Events from org2 | 4 events ✓ |
| 3 | ORG_ADMIN reads own org patient timeline | Same count as SA | 9 events ✓ |
| 4 | ORG_ADMIN cannot read other org patient | 403 | 403 ✓ |
| 5 | DOCTOR reads own org patient timeline | Events returned | 9 events ✓ |
| 6 | DOCTOR cannot read other org patient | 403 | 403 ✓ |
| 7 | No token | 401 | 401 ✓ |
| 8 | Wrong role (SECRETARY) | 403 | 403 ✓ |
| 9 | Deleted records excluded | Not in results | Confirmed ✓ |
| 10 | All 4 event types present | APPOINTMENT, QUEUE, ENCOUNTER, PRESCRIPTION | All present ✓ |
| 11 | Sorted newest first | date[0] ≥ date[1] ≥ … | Verified ✓ |
| 12 | passwordHash / deletedAt / vitals absent | All absent | All absent ✓ |

TypeScript type-check: **clean (0 errors).**

---

### 15. Schema Limitations and Future Improvements

**No `MedicalTimelineEvent` model in the schema.**
The schema contains no model for storing manual timeline entries (free-text notes,
lab results, AI summaries, imported history). This is the primary limitation.

When a `MedicalTimelineEvent` model is added to the schema, this endpoint should be
extended to include those rows alongside the computed events. The response shape
(`{ id, type, date, title, description, sourceId, source }`) is designed to
accommodate both computed and stored events without breaking existing consumers.

**Suggested model for a future migration (not yet applied):**
```prisma
enum TimelineEventType {
  ENCOUNTER
  PRESCRIPTION
  APPOINTMENT
  NOTE
  LAB       // future
  RADIOLOGY // future
}

model MedicalTimelineEvent {
  id             String            @id @default(cuid())
  organizationId String
  patientId      String
  eventType      TimelineEventType
  eventDate      DateTime          @default(now())
  title          String?
  notes          String?
  encounterId    String?
  prescriptionId String?
  appointmentId  String?

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  organization Organization  @relation(fields: [organizationId], references: [id])
  patient      Patient       @relation(fields: [patientId], references: [id])
  encounter    Encounter?    @relation(fields: [encounterId], references: [id])
  prescription Prescription? @relation(fields: [prescriptionId], references: [id])
  appointment  Appointment?  @relation(fields: [appointmentId], references: [id])

  @@index([patientId, eventDate])
  @@map("medical_timeline_events")
}
```

**Other limitations:**
- `vitals` is not included in the timeline. If a clinical viewer needs encounter
  vitals inline, the caller must fetch `GET /encounters/:id` separately.
- No pagination. For patients with many years of records, the response could be large.
  Cursor-based pagination should be added before production.
- No date range filtering (`?from=&to=`). Currently returns the full history.
- Prescriptions use `createdAt` as their event date, not a clinical prescribedAt date
  (which does not exist in the schema). In practice, prescriptions are created during
  the encounter so the timestamp is clinically appropriate.

---

### 16. Next Recommended Module

Check the schema before starting each of these — most will require a migration:

1. **Reports (computed, no migration needed)** — aggregate statistics endpoint
   (`GET /api/v1/reports/summary?organizationId=...`) built from existing
   Appointment, Encounter, Patient, and Queue data. Same pattern as this module.

2. **Labs / Radiology** — schema gap. Requires new `LabOrder`, `LabResult`,
   `RadiologyOrder` models before building.

3. **Billing / Invoices** — schema gap. Requires `Invoice`, `InvoiceItem` models.

4. **Patient App endpoints** — patients reading their own records. Requires a
   `PATIENT` role or separate auth strategy, neither of which exists in the schema.

**Recommended next:** Reports — no migration, no schema gap, immediately deliverable.

---

## Cross-Module Architectural Decisions

### Tenant Isolation Patterns
- Direct `organizationId` on model → filter directly: Organizations, Branches,
  Departments, Users, Patients, Appointments, Encounters
- No `organizationId`, joined through User → `user.organizationId`: Doctor
- No `organizationId`, joined through Encounter → `encounter.organizationId`:
  Prescription
- No model at all, ownership via Patient → `patient.organizationId`: Medical Timeline

All isolation enforced inside the Service layer. Controllers do not contain
any organization scoping logic.

### Security Constants
- `passwordHash` never in any SELECT — excluded at query level, never post-filtered
- `deletedAt` never in any SELECT — invisible to all callers
- `vitals` (Json?) excluded from timeline summary — raw JSON not appropriate in
  aggregated views
- `forbidNonWhitelisted: true` on global ValidationPipe — unknown fields in request
  bodies return 400, not silent strip

### Role Access Summary
| Role | Read clinical data | Write clinical data | Delete |
|---|---|---|---|
| SUPER_ADMIN | All orgs | All orgs | All orgs (soft) |
| ORG_ADMIN | Own org | Own org | Own org (soft) |
| DOCTOR | Own org | Own encounters/prescriptions only | Forbidden |
| Others | Forbidden | Forbidden | Forbidden |

### DTO Immutability Pattern
All UpdateDtos use `PartialType(OmitType(...))`. Fields excluded per module:
- `organizationId` — all modules
- `patientId`, `doctorId`, `appointmentId` — Encounter
- `encounterId` — Prescription
- `mrn` — Patient
- `userId` — Doctor

Excluded fields sent in PATCH return **400**, not silent ignore.

### Status Propagation Chain
```
Check-in:  QueueEntry created → Appointment.status = CHECKED_IN
Encounter: Encounter created  → Appointment.status = IN_PROGRESS
                              → QueueEntry.status  = IN_PROGRESS
```

### API Structure
- Base path: `/api`, versioned: `/api/v1/...`
- Port: `3001` (env: `API_PORT`)
- Swagger: `http://localhost:3001/api/docs`
- Login field: **phone**, not email
- Database: Docker only — `docker compose -f docker/docker-compose.yml up -d`

### Seed Credentials
| Role | Phone | Password |
|---|---|---|
| SUPER_ADMIN | +963900000001 | password123 |
| ORG_ADMIN (org1) | +963912345678 | password123 |
| DOCTOR (org1) | +963912001001 | password123 |
