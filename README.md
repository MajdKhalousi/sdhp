# SDHP — Syrian Digital Health Platform

A modular backend REST API for managing clinical operations across multi-tenant healthcare organizations — built with NestJS, Prisma, and PostgreSQL.

---

## Status

**Backend: Production-ready core** — 19 modules complete, 356 test scenarios passing. Stabilization in progress.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 (TypeScript) |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Auth | JWT (RS256 / HS256) — phone + password |
| Cache / Queue | Redis 7 (reserved) |
| Object Storage | MinIO (metadata tracked, upload integration pending) |
| Runtime | Node.js 24 |
| Package Manager | pnpm (monorepo) |
| Containerization | Docker Compose |

---

## Completed Backend Modules

| Module | Endpoints | Tests |
|---|---|---|
| Auth | Login, /me | — |
| Organizations | CRUD | — |
| Branches | CRUD | 12/12 |
| Departments | CRUD | 13/13 |
| Users | CRUD | 18/18 |
| Doctors | CRUD | 18/18 |
| Patients | CRUD | 19/19 |
| Appointments | CRUD | 20/20 |
| Queue | CRUD + workflow | 22/22 |
| Encounters | CRUD | 24/24 |
| Prescriptions | CRUD | 23/23 |
| Medical Timeline | Read-only aggregation | 12/12 |
| Reports | Analytics (4 endpoints) | 12/12 |
| Allergies | Patient-scoped CRUD | 18/18 |
| Labs | Order lifecycle + results | 32/32 |
| Radiology | Order lifecycle + reports | 35/35 |
| Medical Files | File metadata CRUD | 28/28 |
| Billing | Invoices, items, payments | 36/36 |
| Audit Logs | Read-only query API | 14/14 |

**356 test scenarios — all passing.**

---

## Core Healthcare Workflow

```
Patient registered
  └── Appointment scheduled
        └── Queue check-in
              └── Encounter opened
                    ├── Prescriptions issued
                    ├── Lab orders → ORDERED → SAMPLE_COLLECTED → IN_PROGRESS → RESULTED → REVIEWED
                    ├── Radiology orders → ORDERED → SCHEDULED → IN_PROGRESS → RESULTED → REVIEWED
                    └── Invoice created → items added → ISSUED → payments recorded → PAID
```

All status transitions are role-gated. No role can skip steps.

---

## Audit Log Writer

Mutating operations across four modules write structured audit entries automatically via `AuditLogsWriterService`. The writer is fire-and-forget — a failed write never disrupts the primary operation.

| Module | Actions logged |
|---|---|
| Billing | `INVOICE_ISSUED`, `INVOICE_CANCELLED`, `PAYMENT_CREATED` |
| Patients | `CREATE`, `UPDATE`, `SOFT_DELETE` |
| Labs | `CREATE`, `STATUS_TRANSITION`, `RESULT_ENTERED`, `RESULT_REVIEWED`, `SOFT_DELETE` |
| Radiology | `CREATE`, `STATUS_TRANSITION`, `REPORT_ENTERED`, `REPORT_REVIEWED`, `SOFT_DELETE` |

Audit logs are queryable by SUPER_ADMIN at `GET /api/v1/audit-logs`.

---

## Local Development Setup

**Prerequisites:** Docker, Node.js 20+, pnpm

```bash
# 1. Clone and install
git clone <repo-url>
cd sdhp
pnpm install

# 2. Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env if needed (defaults work for local Docker setup)

# 4. Apply migrations and seed
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed

# 5. Start the API
pnpm run dev
```

API runs at `http://localhost:3001`

---

## Docker Services

| Service | Image | Port | Purpose |
|---|---|---|---|
| `sdhp_postgres` | postgres:16-alpine | 5432 | Primary database |
| `sdhp_redis` | redis:7-alpine | 6379 | Cache / future queue |
| `sdhp_minio` | minio/minio:latest | 9000–9001 | Object storage |

Start all: `docker compose -f docker/docker-compose.yml up -d`

---

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env`. Required variables:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/sdhp` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | — | **Change in production** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `API_PORT` | `3001` | HTTP port |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |

---

## API Documentation

Swagger UI is available when the server is running:

```
http://localhost:3001/api/docs
```

All endpoints require a Bearer token (`Authorization: Bearer <token>`) except `GET /api/health`.

Login to obtain a token:

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+963912345678", "password": "password123"}'
```

Seed credentials:

| Role | Phone | Password |
|---|---|---|
| SUPER_ADMIN | +963900000001 | password123 |
| ORG_ADMIN (org1) | +963912345678 | password123 |
| DOCTOR (org1) | +963912001001 | password123 |

---

## Current Limitations

- **No pagination** — all list endpoints return unbounded results. Pagination is the next stabilization priority.
- **No file upload** — Medical Files stores metadata and storage keys only. MinIO presigned URL integration is pending.
- **No real-time** — no WebSocket or SSE layer. Notifications model not yet in schema.
- **Audit log gaps** — Encounters, Prescriptions, Appointments, Medical Files, and Allergies are not yet wired to the audit writer.
- **No email / SMS** — no notification delivery mechanism implemented.
- **No patient-facing portal** — the `PATIENT` role and separate auth strategy are not yet implemented.

---

## Roadmap

### In Progress — System Stabilization
- [x] Fix Billing DELETE to return 204
- [x] Mark health endpoint as `@Public()`
- [ ] Global Prisma exception filter (P2025 → 404, P2002 → 409)
- [ ] Pagination on all list endpoints
- [ ] Performance indexes on high-traffic models

### Next Features
- [ ] Audit Log Writer — Phase 1C (Encounters, Prescriptions, Appointments, Medical Files, Allergies)
- [ ] Billing audit actions: `INVOICE_CREATED`, `ITEM_ADDED`, `ITEM_REMOVED`
- [ ] Notifications schema + module
- [ ] MinIO file upload integration
- [ ] Patient portal (requires `PATIENT` role)

---

## Architecture

SDHP is built as a **Modular Monolith** — a single deployable NestJS application organized into domain-scoped modules. Each module owns its controller, service, and DTOs. There are no shared service calls between modules; cross-cutting concerns (auth, audit logging) are handled via injectable services distributed through the NestJS DI system.

This approach was chosen deliberately over microservices to:
- Eliminate distributed transaction complexity for a clinical data model with many inter-record dependencies
- Keep deployment simple during the early-stage build phase
- Allow clean vertical slicing into services later if scale demands it

The codebase is organized as a pnpm monorepo (`apps/api`) to support a future frontend or worker package without restructuring.

---

## Repository Structure

```
sdhp/
├── apps/
│   └── api/                  # NestJS backend
│       ├── prisma/           # Schema, migrations, seed
│       └── src/
│           ├── common/       # Guards, decorators, types
│           ├── modules/      # Domain modules (one per feature)
│           └── prisma/       # PrismaService
├── docker/                   # Docker Compose files
└── PROGRESS.md               # Detailed build log and technical handoffs
```
