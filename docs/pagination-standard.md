# Pagination Standard

Applies to all `findAll` endpoints in the SDHP API. Every module that exposes a list endpoint must conform to this standard.

---

## Response Shape

Every paginated endpoint returns the same envelope:

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

| Field   | Type     | Description                              |
|---------|----------|------------------------------------------|
| `data`  | `T[]`    | Page of records                          |
| `total` | `number` | Total matching records across all pages  |
| `page`  | `number` | Current page (1-based, echoed from query)|
| `limit` | `number` | Page size (echoed from query)            |

---

## PaginationQueryDto

Location: `apps/api/src/common/dto/pagination-query.dto.ts`

```typescript
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}
```

| Parameter | Default | Min | Max |
|-----------|---------|-----|-----|
| `page`    | `1`     | 1   | —   |
| `limit`   | `20`    | 1   | 100 |

Each module creates a thin subclass:

```typescript
// apps/api/src/modules/appointments/dto/appointment-query.dto.ts
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export class AppointmentQueryDto extends PaginationQueryDto {}
```

The subclass exists to allow future module-specific filters (e.g., status, date range) to be added without touching the shared base.

---

## PaginatedResponse\<T\>

Location: `apps/api/src/common/types/paginated-response.type.ts`

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Controller Convention

```typescript
@Get()
@Version('1')
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DOCTOR)
@ApiOperation({ summary: '...' })
findAll(@Query() query: AppointmentQueryDto, @CurrentUser() user: JwtPayload) {
  return this.service.findAll(query, user);
}
```

Rules:
- `@Query()` receives the module-specific `XxxQueryDto`
- `@CurrentUser()` injects `JwtPayload` — always named `user` in controller parameters
- The controller does no pagination math; it delegates entirely to the service

---

## Service Convention

```typescript
async findAll(
  query: AppointmentQueryDto,
  caller: JwtPayload,
): Promise<PaginatedResponse<AppointmentRecord>> {
  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where = await this.buildWhere(caller);   // or inline if no DOCTOR pre-query

  const [data, total] = await Promise.all([
    this.prisma.appointment.findMany({
      where,
      select: SELECT,
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.appointment.count({ where }),
  ]);

  return { data, total, page, limit };
}
```

Rules:
- `caller` (not `user`) is the conventional parameter name inside the service
- `page` and `limit` defaults are re-applied in the service (not assumed from DTO)
- `findMany` and `count` always share the **same `where` object** — resolved before `Promise.all`
- `skip` / `take` go on `findMany` only; `count` receives only `where`

---

## Strong Typing Convention

Every paginated module defines a type alias immediately after its `SELECT` const:

```typescript
const SELECT = {
  id: true,
  organizationId: true,
  scheduledAt: true,
  // ... all selected fields, including nested relations
} as const;

type AppointmentRecord = Prisma.AppointmentGetPayload<{ select: typeof SELECT }>;
```

The `Prisma.XxxGetPayload<{ select: typeof SELECT }>` pattern derives the exact TypeScript type from the runtime select shape. This means:
- Adding a field to `SELECT` automatically widens the type
- Removing a field automatically narrows it
- The return type of `findAll` is `Promise<PaginatedResponse<AppointmentRecord>>` — fully typed end-to-end

Never use `PaginatedResponse<unknown>` or `PaginatedResponse<any>` in new modules.

---

## Role Scoping Rules

All `findAll` implementations enforce the following access model:

| Role          | Scope                                                      |
|---------------|------------------------------------------------------------|
| `SUPER_ADMIN` | All records globally (no org filter)                       |
| `ORG_ADMIN`   | Records belonging to `caller.organizationId` only          |
| `DOCTOR`      | Records belonging to their org, further filtered to their own `doctorId` where applicable |

The `where` clause for each role:

```typescript
// SUPER_ADMIN — no org restriction
{}                                      // QueueEntry (no deletedAt)
{ deletedAt: null }                     // models with soft delete

// ORG_ADMIN
{ organizationId: caller.organizationId, deletedAt: null }

// DOCTOR (requires pre-query to resolve doctorId)
{ organizationId: caller.organizationId, doctorId: doctorProfile.id, deletedAt: null }
// fallback if no doctor profile found:
{ organizationId: caller.organizationId, deletedAt: null }
```

For models where `organizationId` is not a direct column (e.g. `QueueEntry`), filtering is done through a relation:

```typescript
// ORG_ADMIN on QueueEntry (organizationId lives on Appointment)
{ appointment: { organizationId: caller.organizationId } }
```

---

## buildWhere Extraction Rule

Extract `buildWhere` as a private async method **only when the DOCTOR branch requires a pre-query** (a database call to resolve `doctorProfile.id`). Inline the where logic when all branches are synchronous.

```typescript
private async buildWhere(caller: JwtPayload): Promise<Prisma.AppointmentWhereInput> {
  if (caller.role === UserRole.SUPER_ADMIN) {
    return { deletedAt: null };
  }
  if (caller.role === UserRole.DOCTOR) {
    const doctorProfile = await this.prisma.doctor.findFirst({
      where: { userId: caller.sub, deletedAt: null },
      select: { id: true },
    });
    if (doctorProfile) {
      return { organizationId: caller.organizationId, doctorId: doctorProfile.id, deletedAt: null };
    }
    return { organizationId: caller.organizationId, deletedAt: null };
  }
  return { organizationId: caller.organizationId, deletedAt: null };
}
```

Invariants:
- `buildWhere` must be **pure and deterministic** — each branch returns a fresh object literal
- Never mutate a shared `where` object across branches
- The method is `async` because the DOCTOR branch needs a DB call; the other branches return synchronously inside the async context
- `buildWhere` is always `await`ed before `Promise.all([findMany, count])` so both queries see the identical resolved where

---

## Ordering Rules

| Module       | `orderBy`                    | Rationale                               |
|--------------|------------------------------|-----------------------------------------|
| users        | `{ createdAt: 'desc' }`      | Newest users first                      |
| branches     | `{ createdAt: 'desc' }`      | Newest first                            |
| departments  | `{ createdAt: 'desc' }`      | Newest first                            |
| patients     | `{ createdAt: 'desc' }`      | Newest registrations first              |
| doctors      | `{ createdAt: 'desc' }`      | Newest first                            |
| appointments | `{ scheduledAt: 'desc' }`    | Most recent scheduled time first        |
| encounters    | `{ startedAt: 'desc' }`      | Most recent clinical visit first; `startedAt` ≠ `createdAt` — visits can be backdated |
| prescriptions | `{ createdAt: 'desc' }`      | Newest prescriptions first; no clinical timestamp on the record itself |
| queue         | `{ ticketNumber: 'asc' }`    | Queue order — lowest ticket served next |

Do not change these orderings without updating this document and the relevant index coverage.

---

## Security Rules

### 1. Never expose `passwordHash`

`passwordHash` must never appear in any `SELECT` shape. The `User` model is always selected via a nested relation with an explicit allowlist:

```typescript
const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  isActive: true,
  // passwordHash is intentionally absent
} as const;
```

Whenever `User` is selected (directly or as a relation), verify `passwordHash` is not listed.

### 2. Never add `deletedAt` filters to models that do not have `deletedAt`

`deletedAt` is a soft-delete column. Not every model has it. Adding `{ deletedAt: null }` to a model without the column will cause a Prisma type error or a runtime query failure.

Models **with** `deletedAt` (soft delete): `Organization`, `Branch`, `Department`, `User`, `Doctor`, `Patient`, `Appointment`, `Encounter`, `Prescription`, `LabOrder`, `RadiologyOrder`, `MedicalFile`, `Invoice`.

Models **without** `deletedAt` (hard delete only): `QueueEntry`, `Allergy`, `LabResult`, `RadiologyReport`, `InvoiceItem`, `Payment`, `AuditLog`.

When writing a `buildWhere` for a model without `deletedAt`, omit `deletedAt: null` entirely from all branches including SUPER_ADMIN.

---

## Current Paginated Modules

**Last verified:** Phase 0E-C28-B, against current `apps/api/src/modules/*` and `schema.prisma` directly.

| Module        | Service file                                        | Query DTO                | Strong type              | buildWhere |
|---------------|-----------------------------------------------------|--------------------------|--------------------------|------------|
| users         | `modules/users/users.service.ts`                   | `UserQueryDto`           | `UserRecord`             | inline     |
| branches      | `modules/branches/branches.service.ts`             | `BranchQueryDto`         | `BranchRecord`           | inline     |
| departments   | `modules/departments/departments.service.ts`       | `DepartmentQueryDto`     | `DepartmentRecord`       | inline     |
| patients      | `modules/patients/patients.service.ts`             | `PatientQueryDto`        | `PatientRecord`          | inline     |
| doctors       | `modules/doctors/doctors.service.ts`               | `DoctorQueryDto`         | `DoctorRecord`           | inline     |
| appointments  | `modules/appointments/appointments.service.ts`     | `AppointmentQueryDto`    | `AppointmentRecord`      | extracted  |
| encounters    | `modules/encounters/encounters.service.ts`         | `EncounterQueryDto`      | `EncounterRecord`        | extracted  |
| prescriptions | `modules/prescriptions/prescriptions.service.ts`   | `PrescriptionQueryDto`   | `PrescriptionRecord`     | extracted  |
| queue         | `modules/queue/queue.service.ts`                   | `QueueQueryDto`          | `QueueEntryRecord`       | extracted  |
| billing       | `modules/billing/billing.service.ts`               | `BillingQueryDto`        | `PaginatedResponse<any> & { totalPages: number }` | extracted  |

`billing.findAll()` now uses the full `skip`/`take`/`count` pattern (confirmed directly in code) — no longer partial.

Modules not yet paginated (confirmed: bare `findMany()`, no `skip`/`take`/`count`, and — for `labs`/`radiology` — no `page`/`limit` fields on their query DTOs at all): `labs`, `radiology`, `allergies`.

---

## Database Index Coverage

Indexes added in migration `20260521011417_add_core_indexes` (backend-stabilization-v1):

| Table         | Index name                          | Column          | Reason                                    |
|---------------|-------------------------------------|-----------------|-------------------------------------------|
| `appointments`| `appointments_organizationId_idx`   | `organizationId`| ORG_ADMIN listing; anchors Queue JOIN     |
| `appointments`| `appointments_doctorId_idx`         | `doctorId`      | DOCTOR role scoping                       |
| `appointments`| `appointments_scheduledAt_idx`      | `scheduledAt`   | ORDER BY; future date-range filtering     |
| `appointments`| `appointments_patientId_idx`        | `patientId`     | Patient appointment history               |
| `branches`    | `branches_organizationId_idx`       | `organizationId`| ORG_ADMIN listing                         |
| `departments` | `departments_organizationId_idx`    | `organizationId`| ORG_ADMIN listing                         |

`patients.organizationId` was intentionally omitted — already covered as the leading key of `@@unique([organizationId, mrn])`.

**Last verified:** Phase 0E-C28-B, directly against `schema.prisma`. The gap previously listed here is closed:

| Table           | Indexes present (verified in `schema.prisma`) |
|-----------------|---|
| `encounters`    | `@@index([organizationId])`, `@@index([doctorId])`, `@@index([patientId])`, plus two composite indexes: `@@index([organizationId, followUpDate])`, `@@index([organizationId, doctorId, followUpDate])` |
| `users`         | `@@index([organizationId])` |
| `prescriptions` | `@@index([encounterId])` |

No remaining known index gaps among the tables this document tracks.
