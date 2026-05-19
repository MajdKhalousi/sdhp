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
| 13 | **Reports** | GET /reports/summary, /appointments, /clinical, /queue | 12/12 | ✅ Complete |
| 14 | **Allergies** | CRUD /patients/:patientId/allergies | 18/18 | ✅ Complete |
| 15 | **Labs** | CRUD /lab-orders + /patients/:id/lab-orders | 32/32 | ✅ Complete |
| 16 | **Radiology** | CRUD /radiology-orders + /patients/:id/radiology-orders | 35/35 | ✅ Complete |

**Total: 16 backend modules, 278 test scenarios — all passing.**

---

## Technical Handoff — Radiology

### 1. Module Name
**Radiology** — radiology order lifecycle management with role-gated workflow transitions.

---

### 2. Goal
Expose `RadiologyOrder` and `RadiologyReport` models through an 8-endpoint module. Workflow advances through six statuses via three dedicated PATCH endpoints. Mirrors Labs module pattern with radiology-specific field names and SCHEDULED state replacing SAMPLE_COLLECTED.

---

### 3. Files Created

```
apps/api/src/modules/radiology/
  radiology.module.ts
  radiology.service.ts
  radiology.controller.ts          (exports RadiologyController + PatientRadiologyOrdersController)
  dto/create-radiology-order.dto.ts
  dto/update-radiology-order-status.dto.ts
  dto/upsert-radiology-report.dto.ts
  dto/review-radiology-report.dto.ts
  dto/radiology-query.dto.ts
```

---

### 4. Files Modified

| File | Change |
|---|---|
| `apps/api/src/app.module.ts` | `RadiologyModule` added to imports |
| `PROGRESS.md` | This file |

---

### 5. Endpoints Added

| Method | Route | Roles |
|---|---|---|
| `POST` | `/api/v1/radiology-orders` | SA, OA, DOCTOR |
| `GET` | `/api/v1/radiology-orders` | SA, OA, DOCTOR, NURSE, TECHNICIAN, SECRETARY |
| `GET` | `/api/v1/radiology-orders/:id` | SA, OA, DOCTOR, NURSE, TECHNICIAN, SECRETARY |
| `PATCH` | `/api/v1/radiology-orders/:id/status` | SA, OA, DOCTOR, NURSE, TECHNICIAN |
| `PATCH` | `/api/v1/radiology-orders/:id/report` | SA, OA, TECHNICIAN |
| `PATCH` | `/api/v1/radiology-orders/:id/review` | SA, OA, DOCTOR |
| `DELETE` | `/api/v1/radiology-orders/:id` | SA, OA, DOCTOR (own orders only) |
| `GET` | `/api/v1/patients/:patientId/radiology-orders` | SA, OA, DOCTOR, NURSE, TECHNICIAN, SECRETARY |

`PatientRadiologyOrdersController` uses `@Controller('patients')` — 3-segment path `/patients/:patientId/radiology-orders` resolves without conflict with other patient controllers.

---

### 6. DTO Fields and Validation Rules

**`CreateRadiologyOrderDto`**
| Field | Type | Notes |
|---|---|---|
| `organizationId` | `string?` | SA only; auto-derived from patient if omitted |
| `branchId` | `string?` | Validated against resolved org |
| `patientId` | `string` | Required |
| `encounterId` | `string?` | Validated against org and patient |
| `orderedById` | `string?` | Required for SA/OA; ignored for DOCTOR (auto-resolved) |
| `modality` | `string` | Required. Free string: X-RAY, CT, MRI, ULTRASOUND… |
| `bodyPart` | `string?` | CHEST, ABDOMEN, HEAD, SPINE… |
| `clinicalInfo` | `string?` | Clinical indication for the exam |
| `priority` | `string?` | ROUTINE / URGENT / STAT (convention only) |
| `notes` | `string?` | |

`status`, `scheduledAt`, `cancelledAt`, `deletedAt` excluded from DTO.

**`UpdateRadiologyOrderStatusDto`**: `status: RadiologyOrderStatus` (`@IsEnum`), `cancelReason?: string`

**`UpsertRadiologyReportDto`**: `findings?: string`, `impression?: string`, `reportedAt?: string` (`@IsDateString`). `reportedById`/`reviewedById`/`reviewedAt` excluded — auto-resolved.

**`ReviewRadiologyReportDto`**: Empty. Service auto-sets `reviewedById` + `reviewedAt`.

**`RadiologyQueryDto`**: `organizationId?`, `branchId?`, `patientId?`, `status?: RadiologyOrderStatus`, `from?`, `to?`

---

### 7. Service Business Logic

**`create`**
1. `resolveCreateOrgId`: SA uses `dto.organizationId` or derives from patient. Non-SA uses `caller.organizationId`; cross-org → 403.
2. Fetch patient; cross-org patient → 403. Not found → 404.
3. Validate `branchId` and `encounterId` against org if provided.
4. DOCTOR: auto-resolve `orderedById` from `caller.sub`. SA/OA: `orderedById` required, validated in org.
5. `radiologyOrder.create`.

**`updateStatus`**
1. Fetch order, assert org access.
2. Block RESULTED (use `/report`) and REVIEWED (use `/review`) as targets — 400.
3. `assertValidTransition(from, to)` via `VALID_TRANSITIONS` map.
4. `assertRoleCanTransition`:
   - NURSE: only `ORDERED → SCHEDULED`
   - TECHNICIAN: only `SCHEDULED → IN_PROGRESS`
   - DOCTOR: `ORDERED → SCHEDULED` or `CANCELLED` (own orders only)
   - SA/OA: any valid transition
5. Side effects: `scheduledAt = now()` on SCHEDULED; `cancelledAt = now()` on CANCELLED.

**`upsertReport`** (TECHNICIAN, OA, SA)
1. Order must be `IN_PROGRESS` → 400 otherwise.
2. Best-effort `reportedById`: resolve caller's Doctor profile; stays null if no profile (TECHNICIAN has no Doctor profile — request does not fail).
3. `$transaction([radiologyReport.upsert, radiologyOrder.update → RESULTED])` — atomic.

**`reviewReport`** (DOCTOR, OA, SA)
1. Order must be `RESULTED` → 400 otherwise.
2. `report` must exist → 400 otherwise.
3. Resolve `reviewedById` from Doctor profile (required for DOCTOR, best-effort for SA/OA).
4. `$transaction([radiologyReport.update → reviewedById/At, radiologyOrder.update → REVIEWED])` — atomic.

---

### 8. Tenant Isolation Strategy

`RadiologyOrder.organizationId` is the direct tenant anchor. Identical to Labs.

`RadiologyReport` has no `organizationId`. Access gated through parent `RadiologyOrder` — `fetchOrder` validates org before any report operation.

SA omits org filter for reads. SA requires explicit `organizationId` for creates OR auto-derives from patient.

---

### 9. RBAC / Access Rules

| Role | Create | Read | `/status` | `/report` | `/review` | Delete |
|---|---|---|---|---|---|---|
| SUPER_ADMIN | Any org | Any org | Any valid | Any org | Any org | Any org |
| ORG_ADMIN | Own org | Own org | Any valid | Own org | Own org | Own org |
| DOCTOR | Own org | Own org | ORDERED→SCHEDULED + cancel own | — | Own org | Own orders only |
| NURSE | — | Own org | ORDERED→SCHEDULED only | — | — | — |
| TECHNICIAN | — | Own org | SCHEDULED→IN_PROGRESS only | Own org | — | — |
| SECRETARY | — | Own org | — | — | — | — |
| ACCOUNTANT | 403 | 403 | 403 | 403 | 403 | 403 |

---

### 10. Prisma Schema Fields and Relations Used

**`RadiologyOrder`**: all fields except `deletedAt`. `orderedBy → Doctor @relation("RadiologyOrdersOrdered")`. `report → RadiologyReport?`.

**`RadiologyReport`**: all fields. `reportedBy → Doctor? @relation("RadiologyReportsReported")`. `reviewedBy → Doctor? @relation("RadiologyReportsReviewed")`. No `deletedAt`.

Named relations required because Doctor has multiple relations to both `RadiologyOrder` and `RadiologyReport`.

---

### 11. Soft Delete / Hard Delete Behavior

| Model | Behavior |
|---|---|
| `RadiologyOrder` | Soft delete — `deletedAt = new Date()`. All queries filter `deletedAt: null`. |
| `RadiologyReport` | No `deletedAt`. Immutable medical record. If parent order is soft-deleted, report row is preserved for audit. |

---

### 12. Security Decisions

**`passwordHash` never fetched** — not in any SELECT constant.

**`deletedAt` never returned** — not in `ORDER_SELECT` or `REPORT_SELECT`.

**Three dedicated PATCH endpoints** — `/status`, `/report`, `/review`. Each has its own `@Roles` guard. TECHNICIAN cannot review; DOCTOR cannot enter reports; NURSE cannot advance past SCHEDULED.

**DOCTOR `orderedById` override ignored** — even if DOCTOR sends `orderedById` in the body, it is resolved from `caller.sub`. Cannot impersonate another doctor.

**Atomic transitions** — both `upsertReport` and `reviewReport` use Prisma `$transaction` array form.

**`reportedById` best-effort** — if caller has no Doctor profile (TECHNICIAN), `reportedById` stays null. The request still succeeds.

---

### 13. Workflow Status Transitions

```
ORDERED
  ↓ NURSE / DOCTOR / OA / SA — scheduledAt set
SCHEDULED
  ↓ TECHNICIAN / OA / SA
IN_PROGRESS
  ↓ TECHNICIAN / OA / SA (via /report — atomic with RadiologyReport creation)
RESULTED
  ↓ DOCTOR / OA / SA (via /review — atomic with RadiologyReport.reviewedById/At)
REVIEWED  ← terminal

Any non-terminal → CANCELLED (DOCTOR own orders only; OA/SA any)  ← terminal
```

`VALID_TRANSITIONS` map:
```
ORDERED     → [SCHEDULED, CANCELLED]
SCHEDULED   → [IN_PROGRESS, CANCELLED]
IN_PROGRESS → [CANCELLED]
RESULTED    → [CANCELLED]
```

---

### 14. Test Results (35/35 PASS)

| # | Test | Result |
|---|---|---|
| 1 | SA creates for any org (explicit organizationId) | ✓ |
| 2 | OA creates in own org | ✓ |
| 3 | OA cross-org patient → 403 | ✓ |
| 4 | DOCTOR creates, orderedById auto-resolved | ✓ |
| 5 | NURSE cannot create → 403 | ✓ |
| 6 | TECHNICIAN cannot create → 403 | ✓ |
| 7 | SECRETARY cannot create → 403 | ✓ |
| 8 | SA lists all orgs | ✓ |
| 9 | OA lists only own org | ✓ |
| 10 | DOCTOR lists own org | ✓ |
| 11 | SECRETARY lists own org | ✓ |
| 12 | OA cross-org GET by ID → 403 | ✓ |
| 13 | NURSE ORDERED → SCHEDULED, scheduledAt set | ✓ |
| 14 | NURSE SCHEDULED → IN_PROGRESS → 403 | ✓ |
| 15 | TECHNICIAN SCHEDULED → IN_PROGRESS | ✓ |
| 16 | TECHNICIAN enters report, order → RESULTED | ✓ |
| 17 | TECHNICIAN report when not IN_PROGRESS → 400 | ✓ |
| 18 | DOCTOR reviews RESULTED, reviewedById + reviewedAt set | ✓ |
| 19 | DOCTOR cannot enter report → 403 | ✓ |
| 20 | REVIEWED terminal → 400 | ✓ |
| 21 | CANCELLED terminal → 400 | ✓ |
| 22 | DOCTOR cancels own order, cancelledAt set | ✓ |
| 23 | DOCTOR cannot cancel another doctor's order → 403 | ✓ |
| 24 | OA soft deletes order, deletedAt not in response | ✓ |
| 25 | Deleted order hidden from list + GET → 404 | ✓ |
| 26 | /status with status=RESULTED → 400 | ✓ |
| 27 | /status with status=REVIEWED → 400 | ✓ |
| 28 | Invalid date query string → 400 | ✓ |
| 29 | Branch from wrong org in create → 400 | ✓ |
| 30 | Non-existent patientId → 404 | ✓ |
| 31 | Non-existent radiology order ID → 404 | ✓ |
| 32 | No token → 401 | ✓ |
| 33 | ACCOUNTANT → 403 | ✓ |
| 34 | passwordHash and deletedAt never in responses | ✓ |
| 35 | GET /patients/:patientId/radiology-orders returns correct patient orders | ✓ |

TypeScript type-check: **clean (0 errors).**

---

### 15. Schema Limitations and Future Improvements

- **`modality` is a free string** — no enum enforcement. X-RAY/CT/MRI/ULTRASOUND are convention only.
- **`priority` is a free string** — same limitation as Labs.
- **`reportedById` nullable for TECHNICIAN** — TECHNICIAN has no Doctor profile; report authorship is untracked in that case.
- **No `RadiologyReport.deletedAt`** — reports are immutable. A radiology exam must be re-ordered to supersede a report.
- **No pagination on list endpoints** — acceptable for MVP, required before production.

---

### 16. Next Recommended Module

1. **Notifications** — in-app notification model. Requires `Notification` schema migration. Lower complexity than Billing.
2. **Billing** — `Invoice` + `InvoiceItem`. High complexity due to financial rules. Build after clinical ordering chain is complete.
3. **Audit Logs** — `AuditLog` model already in schema. Low migration risk; expose read endpoints for SUPER_ADMIN.

**Recommended next:** Review schema and propose Notifications or Audit Logs migration — both are lower complexity than Billing.

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

---

---

---

## Technical Handoff — Labs

### 1. Module Name
**Labs** — lab order lifecycle management with role-gated workflow transitions.

---

### 2. Goal
Expose `LabOrder` and `LabResult` models through a 9-endpoint module. Workflow advances through six statuses via three dedicated PATCH endpoints. Each role is restricted to specific transitions. No role can skip steps.

---

### 3. Files Created

```
apps/api/src/modules/labs/
  labs.module.ts
  labs.service.ts
  labs.controller.ts          (exports LabsController + PatientLabOrdersController)
  dto/create-lab-order.dto.ts
  dto/update-lab-order-status.dto.ts
  dto/upsert-lab-result.dto.ts
  dto/review-lab-result.dto.ts
  dto/lab-query.dto.ts
```

---

### 4. Files Modified

| File | Change |
|---|---|
| `apps/api/src/app.module.ts` | `LabsModule` added to imports |
| `PROGRESS.md` | This file |

---

### 5. Endpoints Added

| Method | Route | Roles |
|---|---|---|
| `POST` | `/api/v1/lab-orders` | SA, OA, DOCTOR |
| `GET` | `/api/v1/lab-orders` | SA, OA, DOCTOR, NURSE, TECHNICIAN, SECRETARY |
| `GET` | `/api/v1/lab-orders/:id` | SA, OA, DOCTOR, NURSE, TECHNICIAN, SECRETARY |
| `PATCH` | `/api/v1/lab-orders/:id/status` | SA, OA, DOCTOR, NURSE, TECHNICIAN |
| `PATCH` | `/api/v1/lab-orders/:id/result` | SA, OA, TECHNICIAN |
| `PATCH` | `/api/v1/lab-orders/:id/review` | SA, OA, DOCTOR |
| `DELETE` | `/api/v1/lab-orders/:id` | SA, OA, DOCTOR (own orders only) |
| `GET` | `/api/v1/patients/:patientId/lab-orders` | SA, OA, DOCTOR, NURSE, TECHNICIAN, SECRETARY |

`PatientLabOrdersController` uses `@Controller('patients')` — same prefix as `PatientsController` and `MedicalTimelineController`. Path depth resolves without conflict (`/patients/:patientId/lab-orders` is 3-segment).

---

### 6. DTO Fields and Validation Rules

**`CreateLabOrderDto`**
| Field | Type | Validation |
|---|---|---|
| `organizationId` | `string?` | SA only; auto-derived from patient if omitted |
| `branchId` | `string?` | Validated against resolved org |
| `patientId` | `string` | Required |
| `encounterId` | `string?` | Validated against org and patient |
| `orderedById` | `string?` | Required for SA/OA; ignored for DOCTOR |
| `testName` | `string` | Required |
| `testCode` | `string?` | Optional |
| `priority` | `string?` | Free text: ROUTINE, URGENT, STAT |
| `notes` | `string?` | Optional |

`status`, `collectedAt`, `cancelledAt`, `deletedAt` excluded from DTO — not accepted from caller.

**`UpdateLabOrderStatusDto`**: `status: LabOrderStatus` (required, `@IsEnum`), `cancelReason?: string`

**`UpsertLabResultDto`**: `resultValue?`, `unit?`, `referenceRange?`, `interpretation?`, `resultNotes?`, `resultAt?` (ISO date). `reviewedById`/`reviewedAt` excluded.

**`ReviewLabResultDto`**: Empty. Service auto-sets `reviewedById` + `reviewedAt`.

**`LabQueryDto`**: `organizationId?`, `branchId?`, `patientId?`, `status?: LabOrderStatus`, `from?`, `to?`

---

### 7. Service Business Logic

**`create`**
1. `resolveCreateOrgId`: SA uses `dto.organizationId` or derives from patient lookup. Non-SA uses `caller.organizationId`; cross-org → 403.
2. Fetch patient; cross-org patient → 403. Patient not found → 404.
3. Validate `branchId` belongs to org if provided.
4. Validate `encounterId` belongs to org and patient if provided.
5. DOCTOR: auto-resolve `orderedById` from `caller.sub` → Doctor profile. SA/OA: `orderedById` required, validated in org.
6. `labOrder.create`.

**`updateStatus`**
1. Fetch order, assert org access.
2. Block `RESULTED` (use `/result`) and `REVIEWED` (use `/review`) as targets — 400.
3. `assertValidTransition(from, to)` — checks `VALID_TRANSITIONS` map.
4. `assertRoleCanTransition(order, to, caller)`:
   - NURSE: only `ORDERED → SAMPLE_COLLECTED`
   - TECHNICIAN: only `SAMPLE_COLLECTED → IN_PROGRESS`
   - DOCTOR: `ORDERED → SAMPLE_COLLECTED` or `CANCELLED` (own orders only)
   - SA/OA: any valid transition
5. Side effects: `collectedAt = now()` on SAMPLE_COLLECTED; `cancelledAt = now()` on CANCELLED.

**`upsertResult`** (TECHNICIAN, OA, SA)
1. Order must be `IN_PROGRESS` → 400 otherwise.
2. `$transaction([labResult.upsert, labOrder.update → RESULTED])` — atomic.

**`reviewResult`** (DOCTOR, OA, SA)
1. Order must be `RESULTED` → 400 otherwise.
2. `result` must exist → 400 otherwise.
3. Resolve `reviewedById` from caller's Doctor profile (required for DOCTOR, best-effort for SA/OA).
4. `$transaction([labResult.update → set reviewedById/At, labOrder.update → REVIEWED])` — atomic.

**`remove`**
- DOCTOR: only if `order.orderedById === callerDoctorId` → 403 otherwise.
- Soft delete: `labOrder.update({ deletedAt: new Date() })`.

---

### 8. Tenant Isolation Strategy

`LabOrder.organizationId` is the direct tenant anchor. All list queries: `where: { organizationId: caller.organizationId, deletedAt: null }`.

`LabResult` has no `organizationId`. Access is gated through the parent `LabOrder` — `fetchOrder` validates org before any result operation.

SA omits org filter for reads (all orgs). SA requires explicit `organizationId` for creates OR auto-derives from patient.

`resolveCreateOrgId` handles both SA and non-SA cases. `resolveReadOrgId` is separate (returns `undefined` for SA all-orgs reads).

---

### 9. RBAC / Access Rules

| Role | Create | Read | `/status` | `/result` | `/review` | Delete |
|---|---|---|---|---|---|---|
| SUPER_ADMIN | Any org | Any org | Any valid | Any org | Any org | Any org |
| ORG_ADMIN | Own org | Own org | Any valid | Own org | Own org | Own org |
| DOCTOR | Own org | Own org | ORDERED→SAMPLE_COLLECTED + cancel own | — | Own org | Own orders only |
| NURSE | — | Own org | ORDERED→SAMPLE_COLLECTED only | — | — | — |
| TECHNICIAN | — | Own org | SAMPLE_COLLECTED→IN_PROGRESS only | Own org | — | — |
| SECRETARY | — | Own org | — | — | — | — |
| ACCOUNTANT | 403 | 403 | 403 | 403 | 403 | 403 |

---

### 10. Prisma Schema Fields and Relations Used

**`LabOrder`**: all fields except `deletedAt` in responses. `orderedById → Doctor @relation("LabOrdersOrdered")`. `result → LabResult?`.

**`LabResult`**: all fields. `reviewedById → Doctor? @relation("LabResultsReviewed")`. No `deletedAt`.

**Relation filters:**
- Doctor org check via `{ user: { organizationId: orgId } }`
- Encounter validation via `{ organizationId, patientId, deletedAt: null }`

---

### 11. Soft Delete / Hard Delete Behavior

| Model | Behavior |
|---|---|
| `LabOrder` | Soft delete — `deletedAt = new Date()`. All queries filter `deletedAt: null`. |
| `LabResult` | No `deletedAt`. Immutable medical record. Never deleted via API. If parent order is soft-deleted, result row is orphaned but preserved for audit. |

---

### 12. Security Decisions

**`passwordHash` never fetched** — not in any SELECT constant.

**`deletedAt` never returned** — not in `ORDER_SELECT` or `RESULT_SELECT`.

**Three dedicated PATCH endpoints** instead of one generic PATCH. Each endpoint has its own `@Roles` guard, preventing TECHNICIAN from reviewing and NURSE from entering results at the controller level. Fine-grained role-transition logic is enforced in the service.

**DOCTOR orderedById override** — even if a DOCTOR sends `orderedById` in the body, the service ignores it and resolves from `caller.sub`. A doctor cannot impersonate another doctor as the order author.

**Atomic transitions** — `upsertResult` and `reviewResult` both use Prisma `$transaction` (array form). Status update and result mutation are committed together or neither is applied.

---

### 13. Workflow Status Transitions

```
ORDERED
  ↓ NURSE / DOCTOR / OA / SA — collectedAt set
SAMPLE_COLLECTED
  ↓ TECHNICIAN / OA / SA
IN_PROGRESS
  ↓ TECHNICIAN / OA / SA (via /result — atomic with LabResult creation)
RESULTED
  ↓ DOCTOR / OA / SA (via /review — atomic with LabResult.reviewedById/At)
REVIEWED  ← terminal

Any non-terminal → CANCELLED (DOCTOR own orders only; OA/SA any)  ← terminal
```

Valid transitions enforced by `VALID_TRANSITIONS` map in service. RESULTED and REVIEWED targets are blocked at the `/status` endpoint — they have dedicated endpoints.

---

### 14. Test Results (32/32 PASS)

| # | Test | Result |
|---|---|---|
| 1 | SA creates for any org | ✓ |
| 2 | OA creates in own org | ✓ |
| 3 | OA cross-org patient → 403 | ✓ |
| 4 | DOCTOR creates, orderedById auto-resolved | ✓ |
| 5 | NURSE cannot create → 403 | ✓ |
| 6 | TECHNICIAN cannot create → 403 | ✓ |
| 7 | SECRETARY cannot create → 403 | ✓ |
| 8 | SA lists all orgs | ✓ |
| 9 | OA lists only own org | ✓ |
| 10 | DOCTOR lists own org | ✓ |
| 11 | SECRETARY lists own org | ✓ |
| 12 | OA cross-org GET → 403 | ✓ |
| 13 | NURSE ORDERED→SAMPLE_COLLECTED, collectedAt set | ✓ |
| 14 | NURSE SAMPLE_COLLECTED→IN_PROGRESS → 403 | ✓ |
| 15 | TECHNICIAN SAMPLE_COLLECTED→IN_PROGRESS | ✓ |
| 16 | TECHNICIAN enters result, order→RESULTED | ✓ |
| 17 | TECHNICIAN result when not IN_PROGRESS → 400 | ✓ |
| 18 | DOCTOR reviews RESULTED, reviewedById+At set | ✓ |
| 19 | DOCTOR cannot enter result → 403 | ✓ |
| 20 | REVIEWED terminal → 400 | ✓ |
| 21 | CANCELLED terminal → 400 | ✓ |
| 22 | DOCTOR cancels own order | ✓ |
| 23 | DOCTOR cannot cancel another doctor's order → 403 | ✓ |
| 24 | OA soft deletes own org order | ✓ |
| 25 | Deleted order hidden from list + GET → 404 | ✓ |
| 26 | Invalid date query → 400 | ✓ |
| 27 | Branch from wrong org → 400 | ✓ |
| 28 | Non-existent patient → 404 | ✓ |
| 29 | Non-existent lab order → 404 | ✓ |
| 30 | No token → 401 | ✓ |
| 31 | ACCOUNTANT → 403 | ✓ |
| 32 | passwordHash and deletedAt never returned | ✓ |

TypeScript type-check: **clean (0 errors).**

---

### 15. Schema Limitations and Future Improvements

- **`priority` is a free string** — no enum enforcement. ROUTINE/URGENT/STAT are convention only.
- **`interpretation` is a free string** — no standardization. HIGH/LOW/NORMAL/CRITICAL is convention only.
- **No `LabResult.deletedAt`** — results are immutable. A lab must be re-ordered to supersede a result.
- **`LabResult` reviewedBy is nullable for SA/OA** — if an OA or SA with no Doctor profile reviews a result, `reviewedById` is null but `reviewedAt` is set. This is intentional for MVP.
- **No `collectedById`** — who collected the sample is not tracked. Add `collectedById String?` → User or Doctor if required.
- **No pagination on list endpoints** — acceptable for MVP, required before production.

---

### 16. Next Recommended Module

1. **Radiology** — mirrors Labs exactly (`RadiologyOrder` + `RadiologyReport`). Same status workflow. Requires schema migration.
2. **Notifications** — in-app notification fan-out. No complex workflow. Requires `Notification` model.
3. **Billing** — `Invoice` + `InvoiceItem`. High complexity due to financial rules. Defer until clinical chain is complete.

**Recommended next:** Radiology — same architecture as Labs, fastest to ship.

---

## Technical Handoff — Allergies

### 1. Module Name
**Allergies** — patient-scoped CRUD for allergy records.

---

### 2. Goal
Expose the existing `Allergy` model through patient-nested REST endpoints. No migration required — the model was already in the schema with no prior API surface.

---

### 3. Files Created

```
apps/api/src/modules/allergies/
  allergies.module.ts
  allergies.service.ts
  allergies.controller.ts
  dto/create-allergy.dto.ts
  dto/update-allergy.dto.ts
```

---

### 4. Files Modified

| File | Change |
|---|---|
| `apps/api/src/app.module.ts` | Added `AllergiesModule` import and registration |
| `PROGRESS.md` | This file |

---

### 5. Endpoints Added

| Method | Route | Roles |
|---|---|---|
| `GET` | `/api/v1/patients/:patientId/allergies` | SA, OA, DOCTOR, NURSE |
| `POST` | `/api/v1/patients/:patientId/allergies` | SA, OA, DOCTOR, NURSE |
| `PATCH` | `/api/v1/patients/:patientId/allergies/:id` | SA, OA, DOCTOR, NURSE |
| `DELETE` | `/api/v1/patients/:patientId/allergies/:id` | SA, OA, DOCTOR only |

NURSE is excluded from DELETE. SECRETARY, ACCOUNTANT, TECHNICIAN are forbidden on all routes.

---

### 6. DTO Fields and Validation Rules

**`CreateAllergyDto`**
| Field | Type | Validation |
|---|---|---|
| `substance` | `string` | Required, `@IsString` |
| `reaction` | `string?` | Optional, `@IsString` |
| `severity` | `string?` | Optional, `@IsString` |

**`UpdateAllergyDto`** — `PartialType(CreateAllergyDto)`, all fields optional.
`patientId` and `organizationId` are not part of any DTO — they cannot be sent or overridden by a caller.

---

### 7. Service Business Logic

Every service method follows the same two-step validation pattern before any mutation:

**Step 1 — `resolvePatient(patientId, caller)`**
- Fetches patient with `{ id: patientId, deletedAt: null }`
- Throws `NotFoundException` if not found
- Throws `ForbiddenException` if caller is not SUPER_ADMIN and `patient.organizationId !== caller.organizationId`

**Step 2 — `resolveAllergy(id, patientId)`** (update/delete only)
- Fetches allergy with `{ id, patientId }` — the `patientId` condition prevents cross-patient access
- Throws `NotFoundException` if not found (covers both "doesn't exist" and "belongs to different patient")

**Methods:**
- `findAll`: resolvePatient → `allergy.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } })`
- `create`: resolvePatient → `allergy.create`
- `update`: resolvePatient → resolveAllergy → `allergy.update`
- `remove`: resolvePatient → resolveAllergy → `allergy.delete` (**hard delete**)

---

### 8. Tenant Isolation Strategy

`Allergy` has no `organizationId`. Ownership is through:
```
Allergy.patientId → Patient.organizationId
```

The service fetches the parent patient first and validates org ownership before any allergy operation. This ensures an ORG_ADMIN or DOCTOR from org-B cannot read, write, or delete allergies of a patient belonging to org-A, even if they know the allergy ID.

The `resolveAllergy` helper uses `{ id, patientId }` — not just `{ id }` — so a caller cannot reference an allergy from a different patient by guessing its ID and passing a patient they do have access to.

All isolation is inside `AllergiesService`. The controller passes through without scoping logic.

---

### 9. RBAC / Access Rules

| Role | GET | POST | PATCH | DELETE |
|---|---|---|---|---|
| SUPER_ADMIN | Any patient | Any patient | Any patient | Any patient |
| ORG_ADMIN | Own org | Own org | Own org | Own org |
| DOCTOR | Own org | Own org | Own org | Own org |
| NURSE | Own org | Own org | Own org | **Forbidden (403)** |
| SECRETARY / ACCOUNTANT / TECHNICIAN | 403 | 403 | 403 | 403 |
| Unauthenticated | 401 | 401 | 401 | 401 |

---

### 10. Prisma Schema Fields and Relations Used

**`Allergy` model** (all fields used):
- `id`, `patientId`, `substance`, `reaction`, `severity`, `createdAt`, `updatedAt`

**`Patient` model** (for ownership check only):
- `id`, `organizationId`, `mrn`, `firstName`, `lastName`

SELECT constants exclude `passwordHash` and `deletedAt` (Patient has `deletedAt`; Allergy does not).

---

### 11. Soft Delete / Hard Delete Behavior

**`Allergy` has no `deletedAt` field. DELETE is a hard delete.**

`prisma.allergy.delete({ where: { id } })` permanently removes the record. There is no recovery path. This matches the schema design — allergy data is expected to be corrected by PATCH or replaced by POST+DELETE, not soft-removed.

If a future migration adds `deletedAt` to `Allergy`, the `remove` method in the service must be updated to use soft delete instead. The controller returns `204 No Content` on successful delete.

---

### 12. Security Decisions

**`passwordHash` never fetched** — `PATIENT_SELECT` does not include any auth fields.

**`deletedAt` never returned** — not in `ALLERGY_SELECT` or `PATIENT_SELECT`.

**Cross-patient access blocked** — `resolveAllergy` uses `{ id, patientId }` compound filter. An allergy from patient B cannot be accessed via patient A's URL, even if the caller has access to patient A.

**No patient PII over-exposure** — the patient fetch is used only for org ownership validation. Patient data is not included in allergy list responses. Only allergy fields are returned.

---

### 13. Workflow Rules Implemented

1. Patient existence and org ownership validated before every allergy operation.
2. Allergy existence and patient binding validated before update/delete.
3. DELETE is hard — no soft delete, no recovery.
4. `findAll` ordered by `createdAt DESC` — most recent allergy first.
5. NURSE role is permitted on GET/POST/PATCH but blocked by `@Roles` on DELETE at the controller level.

---

### 14. Test Results (18/18 PASS)

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | SA lists org1 patient allergies | 200 array | ✓ |
| 2 | OA lists own org patient allergies | 200 array | ✓ |
| 3 | OA cross-org patient list | 403 | ✓ |
| 4 | DOCTOR own org patient allergies | 200 array | ✓ |
| 5 | NURSE own org patient allergies | 200 array | ✓ |
| 6 | SA creates allergy for any org patient | 201 with id | ✓ |
| 7 | OA creates allergy for own org patient | 201 with id | ✓ |
| 8 | OA creates for cross-org patient | 403 | ✓ |
| 9 | DOCTOR updates own org patient allergy | 200, updated field | ✓ |
| 10 | NURSE updates own org patient allergy | 200, updated field | ✓ |
| 11 | NURSE DELETE | 403 | ✓ |
| 12 | OA hard deletes own org allergy | 204 No Content | ✓ |
| 13 | Non-existent patient | 404 | ✓ |
| 14 | Non-existent allergy | 404 | ✓ |
| 15 | No token | 401 | ✓ |
| 16 | SECRETARY role | 403 | ✓ |
| 17 | Cross-patient PATCH (P2 allergy via P1 URL) | 404 | ✓ |
| 18 | passwordHash and deletedAt absent | Not in response | ✓ |

TypeScript type-check: **clean (0 errors).**

---

### 15. Schema Limitations and Future Improvements

- **No `deletedAt` on `Allergy`** — hard delete only. If audit trail or undo is needed, a migration adding `deletedAt DateTime?` is required, and the service `remove` method must switch to `prisma.allergy.update({ data: { deletedAt: new Date() } })`.
- **`severity` is a free string** — not an enum. Common values are MILD, MODERATE, SEVERE but nothing enforces this. A future migration could add a `AllergySeverity` enum to the schema for consistency.
- **No `verifiedBy` or `verifiedAt`** — there is no workflow for a clinician to mark an allergy as clinically confirmed vs. self-reported. This is relevant for prescription safety checks.

---

### 16. Next Recommended Module

All remaining modules require new Prisma models and migrations. Recommended order:

1. **Labs** — `LabOrder` + `LabResult`. Most common ancillary request after encounters. Status workflow: ORDERED → SAMPLE_COLLECTED → RESULTED → REVIEWED.
2. **Radiology** — mirrors Labs pattern. Best built after Labs to reuse the same design.
3. **Notifications** — in-app notification fan-out. Useful but not blocking clinical workflow.
4. **Billing** — `Invoice` + `InvoiceItem`. High complexity due to business rules (taxes, partial payments, insurance). Defer until clinical chain is complete.

**Recommended next:** Read the schema and propose the `LabOrder`/`LabResult` migration, then build the Labs module.

---

## Technical Handoff — Reports

### 1. Module Name
**Reports** — read-only computed analytics endpoints. No new schema model, no writes.

---

### 2. Goal
Provide aggregated statistics across Appointments, Encounters, Prescriptions,
Patients, Staff, and Queue for operational dashboards and reporting. All data is
assembled at query time from existing tables via `Promise.all`.

---

### 3. Files Created

```
apps/api/src/modules/reports/
  reports.module.ts
  reports.controller.ts
  reports.service.ts
  dto/report-query.dto.ts
```

---

### 4. Files Modified

| File | Change |
|---|---|
| `apps/api/src/app.module.ts` | Added `ReportsModule` import and registration |
| `PROGRESS.md` | This file |

---

### 5. Endpoints Added

| Method | Route | Auth |
|---|---|---|
| `GET` | `/api/v1/reports/summary` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
| `GET` | `/api/v1/reports/appointments` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
| `GET` | `/api/v1/reports/clinical` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |
| `GET` | `/api/v1/reports/queue` | SUPER_ADMIN, ORG_ADMIN, DOCTOR |

All endpoints are GET-only. No POST, PATCH, DELETE.

---

### 6. DTO Fields and Validation Rules

**`ReportQueryDto`** (all fields optional):
| Field | Type | Validation | Notes |
|---|---|---|---|
| `organizationId` | `string?` | `@IsString` | SUPER_ADMIN only — other roles ignored/guarded |
| `branchId` | `string?` | `@IsString` | Validated against resolved org |
| `from` | `string?` | `@IsDateString` | Start of date range (ISO 8601) |
| `to` | `string?` | `@IsDateString` | End of date range (ISO 8601) |

Invalid `from`/`to` values (e.g. `"not-a-date"`) return **400** via global ValidationPipe.

---

### 7. Service Business Logic

**`buildContext(query, caller)`**
1. Calls `resolveOrgId` to determine the scoped organization.
2. If `branchId` is provided, calls `assertBranchBelongsToOrg` — throws 400 if the
   branch is not in the resolved org.
3. Returns `{ orgId, branchId, from, to }` used by all report methods.

**`resolveOrgId(query, caller)`**
- SUPER_ADMIN: uses `query.organizationId` if provided; otherwise `undefined` (all orgs).
- All other roles: uses `caller.organizationId`. If `query.organizationId` is provided
  and differs from `caller.organizationId`, throws 403.

**`getSummary`** — 12 parallel queries via `Promise.all`:
- `patient.count` × 2 (total, active)
- `user.count` (excluding SUPER_ADMIN)
- `doctor.count` × 2 (total, active — joined via `user.organizationId`)
- `appointment.count` × 3 (total by filter, today, upcoming)
- `appointment.groupBy` by status
- `encounter.count`
- `prescription.count` (via `encounter.organizationId`)
- `queueEntry.groupBy` by status (via `appointment.organizationId`)

**`getAppointmentsReport`** — 4 parallel queries:
- total, today, upcoming, groupBy status

**`getClinicalReport`** — 5 parallel queries:
- encounter total, with diagnosis, with treatment plan
- prescription total, with refills

**`getQueueReport`** — 1 `groupBy` query:
- queueEntry grouped by status, totaled

---

### 8. Tenant Isolation Strategy

All queries are wrapped with `orgId` conditional spreading:
```typescript
...(orgId ? { organizationId: orgId } : {})
```
When `orgId` is `undefined` (SUPER_ADMIN, no filter), the condition is omitted and
Prisma returns data across all organizations.

Models without a direct `organizationId` are scoped through relations:
- `Doctor` → `user.organizationId`
- `Prescription` → `encounter.organizationId`
- `QueueEntry` → `appointment.organizationId`

`branchId` filter is applied additionally to Appointments and Encounters
(both have a direct `branchId` field). Branch is validated to belong to the resolved org.

Isolation lives entirely inside `ReportsService`. The controller contains no scoping logic.

---

### 9. RBAC / Access Rules

| Role | Access |
|---|---|
| SUPER_ADMIN | All orgs; can filter by `organizationId` |
| ORG_ADMIN | Own org only; `organizationId` param ignored if it matches own org, 403 if it differs |
| DOCTOR | Own org only; same as ORG_ADMIN |
| NURSE / SECRETARY / ACCOUNTANT / TECHNICIAN | 403 |
| Unauthenticated | 401 |

---

### 10. Prisma Schema Fields and Relations Used

**Direct queries:**
- `Patient`: `organizationId`, `deletedAt`, `isActive`
- `User`: `organizationId`, `deletedAt`, `role`
- `Doctor`: `deletedAt`, `isActive` + relation `user.organizationId`
- `Appointment`: `organizationId`, `branchId`, `deletedAt`, `status`, `scheduledAt`
- `Encounter`: `organizationId`, `branchId`, `deletedAt`, `diagnosis`, `treatmentPlan`
- `Prescription`: `deletedAt`, `refillsLeft` + relation `encounter.organizationId`
- `QueueEntry`: `status` + relation `appointment.organizationId`

**No SELECT constants** — only `count` and `groupBy` queries, no fields returned directly.

---

### 11. Soft Delete / Hard Delete Behavior

This module performs **no deletes** of any kind. All queries filter `deletedAt: null`
where applicable. `QueueEntry` has no `deletedAt` field and is not filtered for it.

---

### 12. Security Decisions

**No entity data in responses** — only aggregate counts and status maps are returned.
No `passwordHash`, `deletedAt`, or any PII fields appear in responses.

**SUPER_ADMIN all-orgs mode** — when `organizationId` is omitted by SUPER_ADMIN, `orgId`
is `undefined`. All where clauses handle this safely via conditional spreading. There
is no accidental data leak — if the condition evaluates to empty, Prisma queries all rows
across all orgs, which is the intended behavior.

**`branchId` validated against resolved org** — prevents a caller from passing a valid
branch ID from a different organization to manipulate filtering.

---

### 13. Workflow Rules Implemented

1. `resolveOrgId` is called first — tenant context is locked before any query runs.
2. `branchId` is validated against the resolved org — 400 if branch doesn't belong.
3. All counting queries run in `Promise.all` — no sequential waterfall.
4. Date filters use `scheduledAt` for appointments, `createdAt` for everything else.
5. "Today" is computed at query time using `setHours(0,0,0,0)` and `setHours(23,59,59,999)`.
6. `groupBy` results are converted to `Record<string, number>` via `toStatusMap`.
7. Queue total is derived from `Object.values(byStatus).reduce(...)` — no separate count query.

---

### 14. Test Results (12/12 PASS)

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | SA summary, no filter | `organizationId: null`, all orgs data | ✓ |
| 2 | SA summary filtered by ORG1 | `organizationId: org1` | ✓ |
| 3 | SA summary filtered by ORG1 + branch | `organizationId + branchId` set | ✓ |
| 4 | OA summary auto-scoped to own org | `organizationId: org1` | ✓ |
| 5 | OA cross-org attempt | 403 | ✓ |
| 6 | DOCTOR can access summary | 200 with data | ✓ |
| 7 | SA appointments report | `total`, `byStatus` present | ✓ |
| 8 | SA clinical report | `encounters`, `prescriptions` present | ✓ |
| 9 | SA queue report | `total`, `byStatus` with named fields | ✓ |
| 10 | Date range filter (`from`/`to`) | `period.from`/`period.to` echoed, counts filtered | ✓ |
| 11 | Invalid date string → 400 | 400 Bad Request | ✓ |
| 12 | Branch from wrong org → 400 | 400 Bad Request | ✓ |

TypeScript type-check: **clean (0 errors).**

---

### 15. Schema Limitations and Future Improvements

- No dedicated `Report` or `AnalyticsSnapshot` model — all data is live at query time.
  For large datasets, query times will grow. Consider adding a nightly materialized view
  or caching layer before production.
- `QueueEntry` has no `branchId` — queue reports cannot be filtered by branch.
- Doctor report (active/total) is org-scoped but not branch-scoped (Doctor has no `branchId`).
- Date range on prescriptions uses `createdAt`, not a clinical date — same limitation as
  the Medical Timeline module.

---

### 16. Next Recommended Module

All remaining modules require schema changes (new migrations):
1. **Labs** — requires `LabOrder`, `LabResult` models
2. **Radiology** — requires `RadiologyOrder`, `RadiologyResult` models
3. **Billing** — requires `Invoice`, `InvoiceItem` models
4. **Notifications** — requires `Notification` model
5. **Patient App** — requires `PATIENT` role or separate auth strategy

**Recommended next:** Read the Prisma schema to decide which migration to apply first.
Schema file: `apps/api/prisma/schema.prisma`

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
