# Medical Timeline Architecture

Reference document for the clinical event timeline system. All timeline writer integrations and the reader API must conform to this document.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [DB Schema](#2-db-schema)
3. [Writer Pattern](#3-writer-pattern)
4. [Event Rules](#4-event-rules)
5. [Transaction Rules](#5-transaction-rules)
6. [Tenant Isolation Rules](#6-tenant-isolation-rules)
7. [Metadata Rules](#7-metadata-rules)
8. [Complete Event Type Reference](#8-complete-event-type-reference)
9. [Per-Event Metadata Shapes](#9-per-event-metadata-shapes)
10. [Reader API](#10-reader-api)
11. [Reader vs Writer Architecture](#11-reader-vs-writer-architecture)
12. [Integration Status](#12-integration-status)
13. [Future Extension Rules](#13-future-extension-rules)

---

## 1. Philosophy

The medical timeline is an **append-only, patient-centric event log**. Every significant clinical action that touches a patient record emits a structured event. The timeline is a projection — it records that something happened, not the full domain state. It is not a replacement for the domain tables (`encounters`, `prescriptions`, `lab_orders`, etc.), which remain the authoritative source of truth.

Core principles:

- **Non-blocking**: a timeline write failure must never fail a primary domain operation.
- **After-commit only**: events are emitted only after the primary DB write has committed.
- **Immutable**: events are never updated or deleted. The log is append-only.
- **Scoped to the patient + org**: every event carries `organizationId` and `patientId`. Cross-org reads are structurally impossible.
- **Minimal metadata**: event metadata contains enough to render a human-readable timeline entry without re-querying the domain table. It does not duplicate the full domain record.

---

## 2. DB Schema

Table: `medical_timeline_events`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` (CUID) | no | Primary key |
| `organizationId` | `text` | no | FK → `organizations.id` |
| `patientId` | `text` | no | FK → `patients.id` |
| `createdById` | `text` | yes | FK → `users.id` — the user who triggered the action; null for system events |
| `eventType` | `MedicalTimelineEventType` | no | Enum — see Section 8 |
| `metadata` | `jsonb` | yes | Event-specific structured data — see Section 9 |
| `createdAt` | `timestamp` | no | Auto-set to `now()` on insert |

No `updatedAt`. No `deletedAt`. Events are immutable once written.

**Indexes:**

| Index | Columns | Purpose |
|---|---|---|
| `medical_timeline_events_pkey` | `id` | PK lookup |
| `medical_timeline_events_organizationId_idx` | `organizationId` | Org-scoped queries |
| `medical_timeline_events_patientId_idx` | `patientId` | Patient timeline fetch |
| `medical_timeline_events_organizationId_patientId_idx` | `(organizationId, patientId)` | Primary reader query anchor |

**Prisma model** (`apps/api/prisma/schema.prisma`):

```prisma
model MedicalTimelineEvent {
  id             String                   @id @default(cuid())
  organizationId String
  patientId      String
  createdById    String?
  eventType      MedicalTimelineEventType
  metadata       Json?

  createdAt DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])
  patient      Patient      @relation(fields: [patientId], references: [id])
  createdBy    User?        @relation("TimelineEventsCreated", fields: [createdById], references: [id])

  @@index([organizationId])
  @@index([patientId])
  @@index([organizationId, patientId])
  @@map("medical_timeline_events")
}
```

---

## 3. Writer Pattern

### Service

`MedicalTimelineWriterService` (`apps/api/src/modules/medical-timeline/medical-timeline-writer.service.ts`)

```typescript
interface TimelineWriteInput {
  organizationId: string;
  patientId: string;
  eventType: MedicalTimelineEventType;
  createdById?: string | null;
  metadata?: Prisma.InputJsonObject | null;
}

@Injectable()
export class MedicalTimelineWriterService {
  private readonly logger = new Logger(MedicalTimelineWriterService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: TimelineWriteInput): Promise<void> {
    try {
      await this.prisma.medicalTimelineEvent.create({ data: { ...input } });
    } catch (err) {
      this.logger.error(
        `Timeline write failed — eventType=${input.eventType} patientId=${input.patientId}`,
        err instanceof Error ? err.stack : String(err),
      );
      // never rethrow — primary operation must not fail if timeline write fails
    }
  }
}
```

### Module DI Wiring

`MedicalTimelineModule` provides and **exports** `MedicalTimelineWriterService`. Any module that needs to emit timeline events must import `MedicalTimelineModule`:

```typescript
// consuming module (e.g. labs.module.ts)
@Module({
  imports: [AuditLogsModule, MedicalTimelineModule],
  controllers: [LabsController, PatientLabOrdersController],
  providers: [LabsService],
})
export class LabsModule {}
```

```typescript
// consuming service (e.g. labs.service.ts)
constructor(
  private prisma: PrismaService,
  private auditWriter: AuditLogsWriterService,
  private timelineWriter: MedicalTimelineWriterService,
) {}
```

Do not import `MedicalTimelineWriterService` directly without importing its module — NestJS DI will throw at startup.

### Injection Pattern per Module

Every integrated module follows the identical 2-file change:

| File | Change |
|---|---|
| `<module>.module.ts` | Add `MedicalTimelineModule` to `imports: []` |
| `<module>.service.ts` | Import `MedicalTimelineEventType` from `@prisma/client`; import and inject `MedicalTimelineWriterService`; emit after primary write |

---

## 4. Event Rules

**Rule 1 — Emit after success only.**
The emit call is always placed after the primary `prisma` operation resolves. A DB write that throws never reaches the emit line. A P2002 conflict, FK violation, or any other thrown error aborts before emit.

**Rule 2 — One emit per operation.**
Each service method emits exactly one event per invocation. No bulk emits, no loops over event arrays.

**Rule 3 — Never rethrow from the writer.**
`MedicalTimelineWriterService.log()` catches all errors internally and logs them. Callers do not wrap the call in try/catch. If the writer fails, the primary operation has already succeeded — the caller's return value is unaffected.

**Rule 4 — `await` the writer call.**
The call is `await`ed, not fire-and-forget at the call site. This ensures the timeline write is attempted before the HTTP response returns, and errors are captured in the request's async context for structured logging.

**Rule 5 — Return the original domain result.**
Capturing the prisma result in a `const` before emitting does not change what the service returns. The API response shape is identical to pre-integration:

```typescript
// before
return await this.prisma.medicalFile.create({ ... });

// after — return shape unchanged
const result = await this.prisma.medicalFile.create({ ... });
await this.timelineWriter.log({ ... });
return result;
```

---

## 5. Transaction Rules

**No transaction wrapper on most modules.**
`prescriptions`, `appointments`, and `medical-files` use a bare `prisma.create()` with no transaction. Emit goes immediately after the `await` resolves.

**`$transaction([...])` array form (labs, radiology).**
`labs.upsertResult()` and `radiology.upsertReport()` use the Prisma array-form transaction to atomically update the result/report and transition the order status. The emit is placed **after** the `await prisma.$transaction([...])` resolves, never inside the transaction array:

```typescript
// CORRECT — emit is outside the transaction
const [updatedOrder, upsertedResult] = await this.prisma.$transaction([
  this.prisma.labOrder.update({ ... }),
  this.prisma.labResult.upsert({ ... }),
]);

await this.auditWriter.log({ ... });
await this.timelineWriter.log({ ... });  // ← after transaction

return updatedOrder;
```

```typescript
// WRONG — never do this
await this.prisma.$transaction([
  this.prisma.labOrder.update({ ... }),
  this.prisma.medicalTimelineEvent.create({ ... }),  // ← DO NOT put timeline inside tx
]);
```

**Why**: if the timeline write is inside the transaction and throws, it rolls back the domain operation. The writer pattern guarantees the opposite — domain operations succeed independently of timeline writes.

**Encounters use interactive transaction (`$transaction(async tx => {...})`).**
The encounter `create()` and `complete()` methods use the callback form of `$transaction`. The emit is placed after the transaction resolves (after the closing `}`), not inside the callback:

```typescript
const encounter = await this.prisma.$transaction(async (tx) => {
  // domain writes...
  return created;
});

await this.timelineWriter.log({ ... });  // ← after transaction resolves
```

---

## 6. Tenant Isolation Rules

**`organizationId` is always sourced from the DB result or from the verified caller context — never from raw DTO input alone.**

Each module resolves `organizationId` before writing and before emitting:

| Module | `organizationId` source for emit |
|---|---|
| appointments | `organizationId` local variable resolved by `resolveOrgId()` before `create()` |
| encounters | `organizationId` local variable resolved before `$transaction` |
| prescriptions | `result.encounter.organizationId` — accessed via nested `ENCOUNTER_SELECT` on the returned record |
| labs | `result.organizationId` — top-level field in `ORDER_SELECT` |
| radiology | `result.organizationId` — top-level field in `ORDER_SELECT` |
| medical-files | `result.organizationId` — top-level field in `FILE_SELECT` |

**`patientId` is always sourced from the DB result, not from `dto.patientId` alone.**
The domain write validates that the patient exists and belongs to the org before the write completes. The returned record's `patientId` is therefore guaranteed to be a valid, org-scoped patient.

**SUPER_ADMIN writes.**
When a `SUPER_ADMIN` creates a record for another org, the `organizationId` is resolved from the patient record (not from the JWT `organizationId`, which may be null). The emit uses `result.organizationId`, ensuring the event is always scoped to the correct tenant.

**Cross-org emits are structurally impossible.**
The writer does not validate org membership — it trusts the caller to pass the correct IDs. The domain service is the gatekeeper. If the domain write succeeds, the `organizationId` and `patientId` in the result are correct by construction.

---

## 7. Metadata Rules

**Rule 1 — Include only display-meaningful fields.**
Metadata must contain enough to render a timeline card without re-querying the domain table. It must not duplicate the entire domain record.

**Rule 2 — Always include a reference ID.**
Each event includes the primary ID of the domain entity that triggered it: `appointmentId`, `encounterId`, `prescriptionId`, `labOrderId`, `radiologyOrderId`, `medicalFileId`. This is the join key if a consumer needs to fetch the full record.

**Rule 3 — `encounterId` is always present, nullable.**
Every event that may or may not be linked to an encounter includes `encounterId: value ?? null`. Never omit the key — use explicit `null` so consumers can always check `metadata.encounterId !== null` without checking for key existence.

**Rule 4 — No internal storage paths.**
`storageKey`, bucket names, signed URLs, and any other storage-layer internals are never included in metadata.

**Rule 5 — No credentials, tokens, or hashed values.**
Never include `passwordHash`, JWTs, API keys, or any security-sensitive field.

**Rule 6 — Serialize dates as ISO 8601 strings.**
`Date` objects that belong in metadata are serialized with `.toISOString()`. `createdAt` and similar timestamps that come from the DB result are already serializable; `scheduledAt` (a `Date` object from Prisma) requires explicit `.toISOString()`.

**Rule 7 — Nullable fields use `?? null`.**
Optional string fields (`bodyPart`, `testCode`, `description`, etc.) use `field ?? null` to produce clean JSON. Never rely on `undefined` coercion.

---

## 8. Complete Event Type Reference

Prisma enum: `MedicalTimelineEventType` (schema.prisma) — 18 values, all integrated. **Last verified: Phase 0E-C28-B, directly against `schema.prisma` and every emit call site in `apps/api/src/modules/*`.**

| Event | Status | Trigger |
|---|---|---|
| `PATIENT_CREATED` | integrated | patient registration (`patients.service.ts`) |
| `PATIENT_UPDATED` | integrated | patient record update (`patients.service.ts`) |
| `PATIENT_ARCHIVED` | integrated | patient soft-delete (`patients.service.ts`) |
| `APPOINTMENT_BOOKED` | integrated | appointment created (`appointments.service.ts`) |
| `FOLLOW_UP_BOOKED` | integrated | appointment created with `sourceEncounterId` (`appointments.service.ts`) |
| `CHECKED_IN` | integrated | patient check-in (`queue.service.ts`) |
| `QUEUE_JOINED` | integrated | queue entry created (`queue.service.ts`) |
| `ENCOUNTER_STARTED` | integrated | encounter created |
| `ENCOUNTER_COMPLETED` | integrated | encounter closed / created with endedAt |
| `PRESCRIPTION_ADDED` | integrated | prescription created |
| `LAB_ORDERED` | integrated | lab order created |
| `LAB_RESULT_ADDED` | integrated | lab result upserted |
| `LAB_RESULT_REVIEWED` | integrated | lab result reviewed (`labs.service.ts`) |
| `RADIOLOGY_ORDERED` | integrated | radiology order created |
| `RADIOLOGY_REPORT_ADDED` | integrated | radiology report upserted |
| `RADIOLOGY_REPORT_REVIEWED` | integrated | radiology report reviewed (`radiology.service.ts`) |
| `MEDICAL_FILE_UPLOADED` | integrated | medical file registered (`medical-files.service.ts`); also emitted by `clinical-reports.service.ts` when a finalized report is exported to PDF and saved as a `MedicalFile` |
| `CLINICAL_REPORT_CREATED` | integrated | clinical report created (`clinical-reports.service.ts`) |

`FILE_UPLOADED`, `RADIOLOGY_RESULT_ADDED`, and `NOTE_ADDED` — previously listed in this table — do not exist in the current schema enum. The first two were renamed (`MEDICAL_FILE_UPLOADED`, `RADIOLOGY_REPORT_ADDED`); `NOTE_ADDED` was removed (no notes module exists, and it is no longer a defined enum value).

---

## 9. Per-Event Metadata Shapes

### `APPOINTMENT_BOOKED`
Source: `appointments.service.ts` → `create()`

```typescript
metadata: {
  appointmentId: result.id,         // string
  scheduledAt: result.scheduledAt.toISOString(),  // ISO 8601 string
}
```

### `ENCOUNTER_STARTED`
Source: `encounters.service.ts` → `create()`

```typescript
metadata: {
  encounterId: encounter.id,           // string
  appointmentId: encounter.appointmentId ?? null,  // string | null
}
```

### `ENCOUNTER_COMPLETED`
Source A — `encounters.service.ts` → `create()` (when `dto.endedAt` is provided at creation time):

```typescript
metadata: {
  encounterId: encounter.id,
  appointmentId: encounter.appointmentId ?? null,
}
```

Source B — `encounters.service.ts` → `complete()` (status transition to COMPLETED):

```typescript
metadata: {
  encounterId: id,
  appointmentId: appointmentId ?? null,
  endedAt: result.endedAt?.toISOString() ?? null,  // string | null
}
```

`endedAt` is only present in the metadata when the event comes from `complete()`. Consumers should treat it as optional.

### `PRESCRIPTION_ADDED`
Source: `prescriptions.service.ts` → `create()`

```typescript
metadata: {
  prescriptionId: result.id,     // string
  encounterId: result.encounterId,  // string — prescriptions always have an encounter
  medication: result.medication,  // string
}
```

Note: `encounterId` is not nullable here. Prescriptions are always encounter-linked by domain constraint.

### `LAB_ORDERED`
Source: `labs.service.ts` → `create()`

```typescript
metadata: {
  labOrderId: result.id,       // string
  testName: result.testName,   // string
  encounterId: result.encounterId ?? null,  // string | null
}
```

### `LAB_RESULT_ADDED`
Source: `labs.service.ts` → `upsertResult()` (after `$transaction`)

```typescript
metadata: {
  labOrderId: id,              // string — order ID passed as route param
  testName: order.testName,    // string — from pre-fetched order
  encounterId: order.encounterId ?? null,  // string | null
}
```

`order` is pre-fetched via `fetchOrder(id)` before the transaction. `organizationId` and `patientId` are sourced from the same pre-fetched object.

### `RADIOLOGY_ORDERED`
Source: `radiology.service.ts` → `create()`

```typescript
metadata: {
  radiologyOrderId: result.id,   // string
  modality: result.modality,     // string (e.g. "X_RAY", "CT", "MRI")
  bodyPart: result.bodyPart ?? null,  // string | null
  encounterId: result.encounterId ?? null,  // string | null
}
```

### `RADIOLOGY_RESULT_ADDED`
Source: `radiology.service.ts` → `upsertReport()` (after `$transaction`)

```typescript
metadata: {
  radiologyOrderId: id,          // string — order ID passed as route param
  modality: order.modality,      // string — from pre-fetched order
  bodyPart: order.bodyPart ?? null,  // string | null
  encounterId: order.encounterId ?? null,  // string | null
}
```

`order` is pre-fetched via `fetchOrder(id)` before the transaction. Same sourcing pattern as `LAB_RESULT_ADDED`.

### `FILE_UPLOADED`
Source: `medical-files.service.ts` → `create()`

```typescript
metadata: {
  medicalFileId: result.id,     // string
  fileName: result.fileName,    // string
  category: result.category,    // MedicalFileCategory enum
  mimeType: result.mimeType,    // string (e.g. "application/pdf")
  encounterId: result.encounterId ?? null,  // string | null
}
```

Excluded: `storageKey`, `sizeBytes` — storage internals and byte counts are not timeline-display data.

---

## 10. Reader API

The reader API exposes a single endpoint that aggregates a patient's clinical history into a chronological, paginated feed.

### Endpoint

```
GET /api/v1/patients/:patientId/timeline
```

**Auth**: Bearer JWT required.

**Roles**: `SUPER_ADMIN`, `ORG_ADMIN`, `DOCTOR`

**Tenant guard**: `SUPER_ADMIN` may access any patient. All other roles are restricted to patients in their own `organizationId`.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `types` | `TimelineEventType[]` | all types | Filter to one or more event categories. Repeatable query param. |
| `from` | ISO 8601 date string | none | Include events at or after this date |
| `to` | ISO 8601 date string | none | Include events at or before this date |
| `page` | integer ≥ 1 | `1` | Page number (1-based) |
| `limit` | integer 1–100 | `20` | Page size |

`TimelineEventType` values (reader classification — distinct from the writer's `MedicalTimelineEventType`):

| Value | Maps to |
|---|---|
| `ENCOUNTER` | `encounters` table |
| `PRESCRIPTION` | `prescriptions` table |
| `LAB_ORDER` | `lab_orders` table |
| `RADIOLOGY_ORDER` | `radiology_orders` table |
| `MEDICAL_FILE` | `medical_files` table |

### Response Shape

```typescript
{
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  data: TimelineEvent[];   // see typed event union below
  total: number;           // total events across all pages
  page: number;
  limit: number;
}
```

### Typed Event Union

Every element of `data` is a discriminated union on `type`:

```typescript
type TimelineEvent =
  | { type: 'ENCOUNTER';       id: string; timestamp: Date; source: TimelineEventSource; data: EncounterEventData }
  | { type: 'PRESCRIPTION';    id: string; timestamp: Date; source: TimelineEventSource; data: PrescriptionEventData }
  | { type: 'LAB_ORDER';       id: string; timestamp: Date; source: TimelineEventSource; data: LabOrderEventData }
  | { type: 'RADIOLOGY_ORDER'; id: string; timestamp: Date; source: TimelineEventSource; data: RadiologyOrderEventData }
  | { type: 'MEDICAL_FILE';    id: string; timestamp: Date; source: TimelineEventSource; data: MedicalFileEventData }
```

`source` carries `{ module: string; entity: string }` for traceability (e.g. `{ module: 'labs', entity: 'LabOrder' }`).

### Event Data Shapes

**EncounterEventData**
```typescript
{
  startedAt: Date;
  endedAt: Date | null;
  chiefComplaint: string | null;
  diagnosisCode: string | null;
  hasDiagnosis: boolean;
  doctor: { id: string; firstName: string; lastName: string; specialization: string | null };
}
```

**PrescriptionEventData**
```typescript
{
  encounterId: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  createdAt: Date;
}
```

**LabOrderEventData**
```typescript
{
  testName: string;
  testCode: string | null;
  status: LabOrderStatus;
  priority: string | null;
  encounterId: string | null;
  createdAt: Date;
  orderedBy: { id: string; firstName: string; lastName: string; specialization: string | null };
}
```

**RadiologyOrderEventData**
```typescript
{
  modality: string;
  bodyPart: string | null;
  status: RadiologyOrderStatus;
  priority: string | null;
  encounterId: string | null;
  createdAt: Date;
  orderedBy: { id: string; firstName: string; lastName: string; specialization: string | null };
}
```

**MedicalFileEventData**
```typescript
{
  category: MedicalFileCategory;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  encounterId: string | null;
  createdAt: Date;
  uploadedBy: { id: string; firstName: string; lastName: string; role: UserRole };
}
```

### Ordering

Events are sorted by `timestamp` descending (most recent first) across all types before pagination is applied. Sorting happens in application memory after parallel fetches — not in SQL.

### Pagination Behavior

The service fetches all matching events for all requested types from the DB, merges and sorts them in memory, then slices with `skip / take`. This means `total` reflects the count across all event types, and `page` / `limit` apply to the merged result.

---

## 11. Reader vs Writer Architecture

This is the most important architectural distinction in the system.

**The Reader API does NOT read from `medical_timeline_events`.**

The reader queries domain tables directly:

```
GET /patients/:id/timeline
  ↓
MedicalTimelineService
  ↓ parallel fetches
  ├── prisma.encounter.findMany(...)       → EncounterEventData
  ├── prisma.prescription.findMany(...)    → PrescriptionEventData
  ├── prisma.labOrder.findMany(...)        → LabOrderEventData
  ├── prisma.radiologyOrder.findMany(...)  → RadiologyOrderEventData
  └── prisma.medicalFile.findMany(...)     → MedicalFileEventData
```

**The `medical_timeline_events` table is the write-side audit log.** It records that an event occurred, when, by whom, and with what minimal metadata. It is available for:
- Audit queries (what happened to this patient and when, independent of domain table changes)
- Analytics and reporting
- Event replay if a domain record is soft-deleted

The reader API gets richer, always-current data by querying domain tables directly with purpose-built SELECT shapes. If a lab order status changes after the initial emit, the reader returns the current status; the event log entry remains as it was at emit time.

**Two separate enum sets reflect this split:**

| Enum | Location | Used by | Values |
|---|---|---|---|
| `MedicalTimelineEventType` | `schema.prisma` | Writer (all modules) | 15 granular events |
| `TimelineEventType` | `common/types/timeline-event.type.ts` | Reader (API response) | 5 entity categories |

---

## 12. Integration Status

**Last verified: Phase 0E-C28-B**, by grepping every `timelineWriter.log(` call site directly in `apps/api/src/modules/*/*.service.ts` and cross-checking the `eventType` passed at each one against the current schema enum.

### Writer integrations (modules with confirmed emit call sites)

| Module | Events emitted |
|---|---|
| appointments | `APPOINTMENT_BOOKED`, `FOLLOW_UP_BOOKED` |
| encounters | `ENCOUNTER_STARTED`, `ENCOUNTER_COMPLETED` |
| prescriptions | `PRESCRIPTION_ADDED` |
| labs | `LAB_ORDERED`, `LAB_RESULT_ADDED`, `LAB_RESULT_REVIEWED` |
| radiology | `RADIOLOGY_ORDERED`, `RADIOLOGY_REPORT_ADDED`, `RADIOLOGY_REPORT_REVIEWED` |
| medical-files | `MEDICAL_FILE_UPLOADED` |
| patients | `PATIENT_CREATED`, `PATIENT_UPDATED`, `PATIENT_ARCHIVED` |
| queue | `CHECKED_IN`, `QUEUE_JOINED` |
| clinical-reports | `CLINICAL_REPORT_CREATED`, `MEDICAL_FILE_UPLOADED` |

This table replaces the previous commit-hash list, which had drifted out of sync with the modules actually wired — exact commit attribution was not re-derived in this pass; `git log -- <path>` is authoritative if that history is needed.

### Not yet integrated

**None.** Every value in the current 18-value `MedicalTimelineEventType` enum has a confirmed emit call site, as of this verification.

### Known deviation from the documented writer pattern

`clinical-reports.service.ts`'s two `timelineWriter.log(...)` calls use `void` instead of `await` — the only 2 of 18 call sites across the codebase that don't follow Rule 4 (§3/§4 above). Not a correctness risk (the writer never rethrows regardless), but worth fixing for consistency if this module is touched again.

---

## 13. Future Extension Rules

### Adding a new event type to the writer

1. Add the event name to `MedicalTimelineEventType` enum in `schema.prisma`
2. Run `prisma migrate dev` to extend the DB enum
3. Import `MedicalTimelineModule` in the consuming module's `.module.ts`
4. Inject `MedicalTimelineWriterService` into the consuming service's constructor
5. Place the emit after the primary DB write, outside any transaction boundary
6. Use `?? null` for all nullable metadata fields
7. Do not include storage paths, byte counts, credentials, or full domain record dumps in metadata
8. Add the new event to Section 8 and Section 9 of this document

### Adding a new event type to the reader

1. Add a value to `TimelineEventType` enum in `common/types/timeline-event.type.ts`
2. Define the event data interface (e.g. `NoteEventData`) in the same file
3. Add the discriminant branch to the `TimelineEvent` union type
4. Add a `SELECT` constant and a private `fetch<Entity>()` method in `MedicalTimelineService`
5. Wire the fetcher into `getPatientTimeline()` behind the `types.includes(...)` guard
6. Add the `SOURCES` entry for the new type
7. Update Section 10 of this document

### Adding a new module from scratch (notes example)

1. Create the notes module with `NotesService`, `NotesController`, `NotesModule`
2. Import `MedicalTimelineModule` in `NotesModule`
3. Inject `MedicalTimelineWriterService` in `NotesService`
4. Emit `NOTE_ADDED` after `prisma.note.create()` resolves
5. Metadata minimum: `{ noteId, noteType, encounterId: ?? null }`
6. Follow Phase 1 (inspect) → Phase 2 (implement) → diff review → commit → push → runtime verify sequence

### Schema extension constraints

- Never add a column to `medical_timeline_events` without a migration
- Never add `updatedAt` or `deletedAt` — the table is append-only by design
- If richer metadata is needed for an existing event, update the emit in the source service — do not backfill old rows
- New indexes on `(eventType)` or `(organizationId, eventType)` may be warranted if analytics queries become common

### What does NOT belong in the timeline

- Internal IDs of junction tables or intermediate states
- Computed values that can change after emit (totals, aggregates, derived statuses)
- Full text of clinical notes (use `noteId` reference only)
- Storage-layer details (S3 keys, bucket names, CDN paths)
- Personally identifiable data beyond what is already in `patientId` (no SSN, no full DOB in metadata)
