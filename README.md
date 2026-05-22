# SDHP — Syrian Digital Health Platform

An integrated clinic management system covering patient registration, appointment scheduling, queue management, and doctor encounter workflows.

---

## Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | Next.js 14 (App Router), React Query, Tailwind CSS |
| Backend   | NestJS 10, Prisma ORM, PostgreSQL  |
| Auth      | JWT (phone + password)             |
| Monorepo  | Turborepo, pnpm workspaces         |

---

## Quick Start

### 1. Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm i -g pnpm`)
- Docker Desktop (for PostgreSQL)

### 2. Start the Database

```bash
pnpm docker:db          # starts only PostgreSQL on port 5432
```

### 3. Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The defaults in `.env.example` work out of the box with the Docker setup — no edits required for local development.

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Run Migrations + Seed

```bash
pnpm db:migrate         # apply all Prisma migrations
pnpm db:seed            # load demo organizations, doctors, patients, appointments
```

### 6. Start Development Servers

```bash
pnpm dev                # starts API (port 3001) + Web (port 3000) together
```

Open http://localhost:3000 — you will be redirected to the login page.

---

## Demo Accounts

See DEMO_USERS.md for the full list of demo accounts with phone numbers, passwords, and workflow descriptions.

**Quick login (all passwords are `password123`):**

| Role        | Phone           | Name             |
|-------------|-----------------|------------------|
| Super Admin | +963900000001   | Super Admin      |
| Org Admin   | +963912345678   | Ahmad Khalil     |
| Secretary   | +963912002001   | Sara Qassem      |
| Doctor      | +963912001001   | Dr. Samer Hassan |

---

## Core Workflows

### Reception Flow
1. Log in as **Secretary** (+963912002001)
2. **Appointments** -> New Appointment -> select patient + doctor + time
3. **Queue** -> Walk-in -> select the appointment -> issue queue ticket
4. Queue board shows ticket number + live wait time

### Doctor Flow
1. Log in as **Doctor** (+963912001001)
2. **My Patients** (doctor queue) shows waiting patients
3. Click **Start Encounter** to open the encounter workspace
4. Fill vitals, chief complaint, diagnosis, ICD code, treatment plan
5. **Save Changes** -> **End Encounter** -> redirects back to queue

### Admin Flow
1. Log in as **Org Admin** (+963912345678)
2. **Patients** -> view all registered patients, search by name/MRN/phone
3. **Appointments** -> filter by date, doctor, or status
4. **Dashboard** -> live counts for today's appointments, queue, patients, doctors

---

## Useful Scripts

| Script            | Description                                      |
|-------------------|--------------------------------------------------|
| `pnpm dev`        | Start all services in development mode           |
| `pnpm build`      | Build all apps                                   |
| `pnpm db:migrate` | Run Prisma migrations                            |
| `pnpm db:seed`    | Load demo data (idempotent — safe to re-run)     |
| `pnpm db:reset`   | Drop + recreate DB, re-run migrations            |
| `pnpm docker:db`  | Start only PostgreSQL (no Redis/MinIO needed)    |
| `pnpm docker:up`  | Start full Docker stack                          |

---

## Project Structure

```
sdhp/
+-- apps/
|   +-- api/          # NestJS backend (port 3001)
|   |   +-- prisma/   # Schema, migrations, seed
|   |   +-- src/      # Modules: auth, patients, appointments, queue, encounters
|   +-- web/          # Next.js frontend (port 3000)
|       +-- src/
|           +-- app/          # Pages (App Router)
|           +-- components/   # UI components
|           +-- hooks/        # React Query hooks
|           +-- types/        # Shared TypeScript types
+-- docker/
|   +-- docker-compose.yml
+-- packages/
    +-- shared/       # Shared utilities (future use)
```

---

## API Documentation

Swagger UI is available at http://localhost:3001/api/docs when the API is running.
