# Elaji Health (SDHP) — Project Master Map

> **Phase 138A — Project Master Map / Single Source of Truth.** Documentation only — no runtime code, package files, or dependencies were touched in producing this document. This is the main entry point for understanding the project: what it is, what exists, what's missing, and what to build next. It synthesizes the detailed docs in [`/docs/architecture/`](architecture/) rather than replacing them — when you need code-level detail, follow the links.
>
> **Companion file:** [`PROJECT_MAP.mmd`](PROJECT_MAP.mmd) — a Mermaid diagram of the same system, visual instead of prose. Render it in any Mermaid-aware viewer (GitHub renders `.mmd`-referencing fenced blocks natively in `.md`; for a standalone `.mmd` file use the Mermaid Live Editor, VS Code's Mermaid extension, or `mmdc` if installed).
>
> **Accuracy note:** Every claim below is grounded in direct code inspection performed across this project's prior architecture-documentation phases (System Architecture, Modules, Database Schema, Permissions Matrix, API Map, Frontend Structure, Deployment, the Architecture Audit Report, and Product-Roadmap-State — all in `/docs/architecture/`). Where this document states something as fact, a more detailed doc backs it. Where the underlying docs flagged something as TODO/Unknown, it is carried forward here rather than resolved by guessing.

---

## 1. Project Vision

Elaji Health (internal codename **SDHP**) is a **multi-tenant SaaS clinic/hospital management platform**. A single deployment serves many independent healthcare organizations ("clinics" — `Organization` in the data model, which can be a `HOSPITAL`, `CLINIC`, or `POLYCLINIC`). Each tenant gets the full operational stack: patient records, scheduling, clinical documentation, billing, labs/radiology, and HR — with one platform operator (**SUPER_ADMIN**) running the SaaS business itself on top.

The product targets the **full patient visit lifecycle inside a clinic**: registration → booking → check-in → clinical encounter → orders (labs/radiology) → billing → payment, plus the **operational backbone** a clinic needs to run itself (staff accounts, HR, reporting) and the **platform backbone** the SaaS operator needs to run the business (tenant onboarding, subscription billing, audit oversight).

It is explicitly **bilingual (Arabic-first, English-second)** with full RTL support — this is not a localization afterthought, it's load-bearing throughout the frontend (see [Frontend Structure.md](architecture/Frontend%20Structure.md) §6).

## 2. Current Product State (one paragraph)

The clinical and financial core is **mature and production-verified**: patients, appointments, doctor scheduling, queue/check-in, encounters, prescriptions, labs, radiology, medical files, clinical reports, allergies, medical timeline, billing/invoicing, and reporting are all classified **Production Ready** with confirmed automated test coverage and production-verification history (see [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md)). **HR is the most recently and actively developed area** — the team's last several shipped phases (147B–147G) are all HR (attendance, leave, employee profiles, documents). The platform/Super Admin layer (tenant onboarding, subscription billing, audit logs) is also Production Ready. The biggest gap relative to apparent completeness is that **Follow-up reminders and Notifications track state but never actually contact a patient** — no SMS/WhatsApp/email/push delivery exists anywhere in the system. Several named-but-unbuilt areas exist as empty placeholder folders (`notifications`, `ai-assistant`, `rooms`, `staff`, `staff-scheduling`) with zero implementation, and **Inventory/stock management does not exist at all**, despite being named in this project's original architecture brief as a core module.

## 3. Main Business Model Direction

Two nested billing relationships, **deliberately kept separate in the data model** (confirmed via `schema.prisma` comments, see [Database Schema.md](architecture/Database%20Schema.md) §5):

1. **Platform → Clinic (SaaS subscription billing).** SUPER_ADMIN onboards a clinic (`Organization`), sets its subscription plan/status, and records `SubscriptionPayment` history against it. This is the platform operator's own revenue. `Organization.subscriptionStatus` (`TRIAL/ACTIVE/SUSPENDED/EXPIRED/CANCELLED`) gates whether that clinic's staff can perform clinical/financial writes at all (`SubscriptionGuard`).
2. **Clinic → Patient (clinical billing).** Each clinic bills its own patients via `Invoice`/`Payment`, independent of and never coupled to the platform subscription relationship.

This is a classic **B2B2C SaaS** shape: the platform's customer is the clinic; the clinic's customer is the patient. Today, subscription billing itself is **manually operated by SUPER_ADMIN** — there is no self-serve billing portal for clinic owners and no payment gateway integration on either billing relationship (see [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md) §F1-F2, §C1).

## 4. Core User Types

| Role | Scope | Notes |
|---|---|---|
| **SUPER_ADMIN** | Platform-wide, all tenants | Bypasses all backend role checks by design (`RolesGuard`), but the **frontend deliberately restricts** SUPER_ADMIN to `/dashboard/platform/*` + profile only (`PlatformOnlyGuard`) — an intentional inversion: most-trusted on the backend, most-confined on the frontend, to keep platform operators out of clinic-operational UI. |
| **ORG_ADMIN** | Single clinic (tenant), all branches | The clinic owner/manager role — broadest access within one `Organization`. |
| **BRANCH_ADMIN** | Intended: single branch | **Confirmed narrow today** — only has real backend grants on Follow-ups (full) and read-only access to 4 catalog/config endpoints. Not yet a fully delegated branch-management tier despite existing in the role enum. |
| **DOCTOR** | Own patients/encounters within org | Clinical role; several modules explicitly scope DOCTOR to their own records (encounters, prescriptions, follow-ups). |
| **NURSE** | Clinical support within org | Triage, queue advancement, lab/radiology operational steps. |
| **SECRETARY** | Front-desk within org | Booking, check-in, invoice creation/issuing. |
| **ACCOUNTANT** | Financial within org | Billing specialist; deliberately excluded from Employee Documents (privacy — may contain ID scans/contracts, not just salary data). |
| **TECHNICIAN** | Labs/Radiology operational within org | Result/report entry only, no ordering authority. |
| **PATIENT** *(does not exist)* | — | **Foundation Exists only** — `Patient.platformId`/`hasPortalAccess` columns and the `ClinicPatient` cross-org link model exist, but there is no `PATIENT` value in the `UserRole` enum, no patient auth strategy, and no patient-facing app. See [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md) §F3. |

## 5. High-Level System Architecture

```
apps/api    NestJS REST API (TypeScript, Prisma, PostgreSQL) — /api/v1/*
apps/web    Next.js App Router frontend (React Query, Zustand, next-intl)
packages/shared   TODO/Unknown — contents not inspected in any pass to date
docker/     Dockerfiles, docker-compose (dev + prod), nginx, certbot, backup scripts
```

Request path (prod): Browser → nginx (TLS, rate limiting) → `apps/web` (Next.js) or `apps/api` (NestJS) → PostgreSQL / MinIO. Every API request passes through a global `JwtAuthGuard` → `RolesGuard` → `SubscriptionGuard` chain before reaching a controller; tenant isolation (`organizationId` scoping) is enforced in the **service layer**, never trusted from client input. Full detail and diagrams: [System Architecture.md](architecture/System%20Architecture.md).

**Confirmed-idle infrastructure:** Redis runs in both dev and prod Docker Compose (password-protected in prod) but is **not consumed by any application code** — the only two references to it anywhere in `apps/api/src` are comments noting that server-side JWT revocation on logout is deferred pending a Redis denylist that was never built (see [Architecture Audit Report.md](architecture/Architecture%20Audit%20Report.md) §1).

## 6. Main Workflows (as actually implemented)

### 6.1 Patient Registration
1. Staff (SECRETARY/ORG_ADMIN/DOCTOR/NURSE/ACCOUNTANT) creates a `Patient` record — MRN auto-generated, unique per `(organizationId, mrn)`.
2. Optional: a `ClinicPatient` link is created/managed for cross-organization patient identity (Phase 126 work) — supports a patient existing across multiple clinics under one platform identity, with a 6-digit verification-code link/verify flow.
3. **Gap:** Duplicate-detection across organizations (Phase 126E) was left at the planning stage — no implementation exists. Patients are otherwise fully CRUD-able with soft delete.
4. There is **no patient self-registration** — a staff member always creates the record (no `PATIENT`-role portal exists; see §4).

### 6.2 Appointment Flow
1. Staff books an `Appointment` against a `Patient` + `Doctor` + optional `VisitType`, validated against that doctor's `DoctorSchedule`/`DoctorScheduleException` (working hours, holidays, custom hours) to prevent invalid slots.
2. Status machine: `SCHEDULED → CONFIRMED → CHECKED_IN → IN_QUEUE → IN_PROGRESS → COMPLETED` (or `CANCELLED`/`NO_SHOW`).
3. Check-in creates a `QueueEntry` (1:1 with the appointment), with a daily-reset ticket number (`businessDate`, Asia/Damascus). A nurse can record triage vitals + a chief-complaint draft on the queue entry before the doctor sees the patient — this prefills the encounter.
4. Writes are blocked (`SubscriptionGuard`) if the clinic's SaaS subscription is inactive.

### 6.3 Encounter Flow
1. Doctor starts the visit → `Encounter` created **idempotently** keyed on `appointmentId` (re-opening an in-progress visit returns the existing record, never duplicates).
2. Doctor documents chief complaint, HPI, vitals (JSON), diagnosis (+ ICD-10 code via a curated combobox), treatment plan, patient instructions; can quick-fill from prior visits.
3. From the encounter the doctor can: write `Prescriptions`, order `LabOrder`/`RadiologyOrder` (routed to NURSE/TECHNICIAN for the operational steps, back to DOCTOR for review), attach `MedicalFile`s, author a `ClinicalReport` (DRAFT→FINALIZED, PDF-exportable), and schedule a `FollowUpReminder`.
4. Every clinically-significant action also writes a `MedicalTimelineEvent` (read-only aggregated history) and, for most mutating actions across most modules, an `AuditLog` entry — coverage for this is broad but **not exhaustively confirmed across every module** (see [Architecture Audit Report.md](architecture/Architecture%20Audit%20Report.md) and [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md) §E3).
5. Ending the visit closes the encounter; appointment/queue states advance to `COMPLETED`/`DONE`.

### 6.4 Billing / Payment Flow
1. An `Invoice` is created either **automatically** on check-in/queue transition (if `BillingPolicy.autoCreateInvoiceOnCheckin` is enabled for the org — the default) or **manually** from the appointment/encounter.
2. While `DRAFT`, `InvoiceItem`s (priced from the `VisitType`/`Service` catalog) can be added/removed; subtotal/total recompute atomically.
3. `PATCH :id/issue` moves `DRAFT → ISSUED` (requires ≥1 item). `Payment`s are recorded against an issued invoice (cash/card/bank-transfer/insurance/other — **no real payment gateway**, these are just labels for a manually-recorded payment); status auto-advances `ISSUED → PARTIALLY_PAID → PAID`. Payments can be voided with a reason; invoices can be cancelled (no hard delete).
4. PDF generation (Puppeteer/Chromium) is available for both invoices and clinical reports. A daily cashier-summary report reconciles collections by payment method.

### 6.5 HR / Employee Flow
1. `EmployeeProfile` is **deliberately decoupled from `User`** — an HR-only employee can exist with no login account, and a login-only account (e.g. SUPER_ADMIN) needs no `EmployeeProfile`. ORG_ADMIN/SUPER_ADMIN create employee profiles, optionally with an attached login account (`CREATE_NEW` or link-existing account modes, per Phase 146B/C).
2. Employee documents (ID scans, contracts, certificates) upload via a presigned-URL flow — **confirmed fully implemented** (Phase 144C), though a stale `schema.prisma` comment still incorrectly describes this as unbuilt (a documentation-debt item, not a functional one).
3. Attendance is recorded **manually**, one row per employee per calendar date (no biometric/device integration).
4. Leave requests go through a create → decide (approve/reject) → (optionally) cancel workflow; approving a leave request does **not** automatically change `employmentStatus` (deliberate design decision).
5. **Gap:** no payroll calculation engine — `baseSalary` is stored but nothing computes net pay or generates payslips. This subsystem is **not gated by `SubscriptionGuard`** — HR access continues even if a clinic's SaaS subscription lapses (administrative function, not clinical revenue).

### 6.6 Super Admin / SaaS Flow
1. SUPER_ADMIN onboards a new clinic via a single atomic endpoint: creates the `Organization` + a first `Branch` + the first `ORG_ADMIN` user in one transaction.
2. SUPER_ADMIN manually sets/updates `Organization.subscriptionStatus`/`subscriptionPlan`/`subscriptionStartAt`/`subscriptionEndAt` and records `SubscriptionPayment` history against the org — **entirely manual, no automated dunning or self-serve payment**.
3. `SubscriptionGuard` blocks clinical/financial writes (appointments, encounters, queue, labs, radiology, billing) org-wide whenever that org's status is inactive. HR and medical-files are deliberately exempt.
4. SUPER_ADMIN can view global, cross-org `AuditLog`s (the only role that can) and platform-wide user/org lists. On the frontend, SUPER_ADMIN is **confined** to `/dashboard/platform/*` by `PlatformOnlyGuard` — they cannot casually browse into any single clinic's day-to-day operational screens.

## 7. Capability Matrix

Condensed from [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md) — that document has full detail (current state / missing work / business value / complexity / priority) per item. This table is the at-a-glance version.

| Tier | Modules |
|---|---|
| **Production Ready** | Auth & Sessions · Users & Staff Accounts · Organizations/Branches/Departments · Patients · Appointments · Doctor Scheduling · Queue/Check-in · Encounters · Prescriptions · Labs · Radiology · Medical Files · Allergies · Medical Timeline · Billing & Invoicing · Clinic Settings & Catalog · Reports & Analytics · Dashboard (Today Hub) · Super Admin / Platform Operations |
| **Mostly Complete** | Clinical Reports (functionally complete, no confirmed test-count) · HR — Employee Profiles/Attendance/Leave/Documents (active development, missing payroll calc + biometric attendance) · Audit Logs (read API solid, writer coverage broad but not exhaustively confirmed) |
| **Foundation Exists** | Follow-ups & Reminders (tracking exists, **no delivery mechanism**) · Patient Portal / Self-Service (data model groundwork only, no auth/UI) |
| **Placeholder Only** | Notifications · AI Assistant · Rooms / Resource Scheduling · (dead/redundant: `staff`, `staff-scheduling` folders — superseded by Users + Employees) |
| **Not Started** | **Inventory / Stock Management** — named in the original architecture brief, zero footprint anywhere in the codebase |

## 8. Roadmap: NOW / NEXT / LATER / SOMEDAY

This reflects **recommended sequencing based on current state, dependency order, and stated business value** — it is a recommendation, not a committed plan. Numbers in parentheses reference the corresponding [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md) section.

### NOW (in flight / finish what's started)
- **HR completion** (D1) — the team's active focus (Phases 147B–147G shipped recently: attendance, leave, dashboard metrics, UX polish). Natural next decision: is payroll calculation in scope, or does HR stop at attendance/leave/documents?

### NEXT (highest leverage, ready to start)
- **Notifications foundation** (G1) — a single pluggable delivery service (start with one channel, e.g. SMS or email). This is the single biggest unlock: it's a hard dependency for Follow-up reminders and improves the Staff invite-flow gap.
- **Follow-up reminder delivery** (B13) — once Notifications exists, wire it into the already-built reminder-tracking workflow. This closes the most visible "looks done but isn't" gap in the product.
- **Audit log coverage sweep** (E3) — confirm/close any remaining mutating endpoints without an audit writer; the pattern is established, this is verification + targeted injection, not new design.
- **Redis denylist** (A1) — cheap to close: the infrastructure is already provisioned and paid for, idle. Closing this finishes real server-side logout revocation.

### LATER (valuable, needs deliberate scoping)
- **Staff self-registration/invite flow** (A2) — partially blocked on Notifications (email delivery for invite links).
- **Patient Portal / Self-Service** (F3) — data model groundwork already exists (`platformId`, `hasPortalAccess`, `ClinicPatient`); this is a standalone initiative (separate auth strategy, separate frontend surface), not an incremental add-on.
- **Payment gateway integration** (C1, F1-F2) — for both clinic-to-patient invoices and platform subscription billing; meaningfully different scope per side.
- **BRANCH_ADMIN full delegation** (A3) — only worth building if/when a customer specifically needs branch-level admin separation.

### SOMEDAY (needs a product decision before any estimate)
- **Inventory / Stock Management (G4)** — strategic go/no-go: is this in scope at all, and for which `OrganizationType`s (hospital/polyclinic vs. small outpatient clinic)? Do not default to building this just because it was named in an early brief.
- **AI Assistant (G2)** — scope is completely undefined; a product-definition exercise must come before any engineering estimate.
- **Rooms / Resource Scheduling (G3)** — no evidence of customer demand yet; the Doctor Scheduling pattern is directly reusable if/when needed.
- **Repo hygiene:** delete the dead `staff`/`staff-scheduling` placeholder folders (no functional loss — their purpose is already served by Users + Employees).

## 9. Known Architectural Decisions

These are deliberate, confirmed design choices (sourced from in-code/in-schema comments and direct inspection — not inferred) that should inform any future work in these areas:

1. **Multi-tenancy is service-layer, not row-level-security or middleware.** `organizationId` is derived server-side from the JWT payload on every request; controllers never contain scoping logic. ([System Architecture.md](architecture/System%20Architecture.md) §3)
2. **`SubscriptionPayment` (platform billing) is permanently decoupled from `Invoice`/`Payment` (clinic billing)** — explicit schema comment states recording one never auto-updates the other. ([Database Schema.md](architecture/Database%20Schema.md) §5)
3. **`EmployeeProfile` is decoupled from `User`** — supports HR-only staff with no login and login-only accounts with no HR profile. ([Database Schema.md](architecture/Database%20Schema.md) §5)
4. **SUPER_ADMIN bypasses every backend `@Roles()` check, but is the *most* frontend-restricted role** — confined to `/dashboard/platform/*` by `PlatformOnlyGuard`. A deliberate inversion, not an inconsistency. ([Permissions Matrix.md](architecture/Permissions%20Matrix.md) §3)
5. **Soft delete is the default** across nearly every domain model (`deletedAt`); a handful of models are append-only/immutable by design (`AuditLog`, `Payment`, `LabResult`, `RadiologyReport`). ([Database Schema.md](architecture/Database%20Schema.md) §1)
6. **ACCOUNTANT is deliberately excluded from Employee Documents** even though it can read other HR data — documents may contain ID scans/contracts, not just salary data. ([Architecture Audit Report.md](architecture/Architecture%20Audit%20Report.md) §6)
7. **Approving a `LeaveRequest` never cascades to `EmployeeProfile.employmentStatus`** — kept as an independent manual control. ([Database Schema.md](architecture/Database%20Schema.md) §5)
8. **HR and Medical Files are exempt from `SubscriptionGuard`** — administrative/record-keeping functions continue even if a clinic's SaaS subscription lapses; only clinical-workflow and revenue-generating writes are blocked. ([Modules.md](architecture/Modules.md))

## 10. Known Gaps and Risks

| Gap/Risk | Severity | Detail |
|---|---|---|
| Follow-up reminders never actually contact patients | **High** — visible product gap | Full tracking/UI exists; zero delivery mechanism. [Product-Roadmap-State.md §B13](architecture/Product-Roadmap-State.md) |
| Notifications module is empty | **High** — blocks the above + staff invite flow | Confirmed `.gitkeep`-only. [Architecture Audit Report.md §2](architecture/Architecture%20Audit%20Report.md) |
| No server-side JWT revocation on logout | Medium — cheap to fix, infra already provisioned (Redis) | [Architecture Audit Report.md §1](architecture/Architecture%20Audit%20Report.md) |
| Audit log writer coverage not exhaustively confirmed across all ~30 modules | Medium — compliance-relevant for a medical-records system | [Product-Roadmap-State.md §E3](architecture/Product-Roadmap-State.md) |
| Inventory/Stock Management does not exist | Medium-High, contingent on target customer | Named in the original brief; zero footprint today. Needs a strategic decision, not a default build. [Product-Roadmap-State.md §G4](architecture/Product-Roadmap-State.md) |
| BRANCH_ADMIN is narrow/inconsistent with its apparent intent | Low-Medium | Real but limited to Follow-ups + 4 read-only catalog endpoints. [Permissions Matrix.md §2 notes](architecture/Permissions%20Matrix.md) |
| Stale schema comment on `EmployeeDocument` | Low — documentation debt, not a functional bug | Comment says "no upload endpoint yet"; feature has shipped (Phase 144C). [Database Schema.md §4](architecture/Database%20Schema.md) |
| Idle, password-protected Redis container in production | Low | Unnecessary attack surface/operational overhead for a service nothing uses yet. [Deployment.md §2](architecture/Deployment.md) |
| Two dead placeholder module folders (`staff`, `staff-scheduling`) | Low — repo hygiene only | Functionally superseded by Users + Employees; recommend deletion. [Product-Roadmap-State.md §G "Note"](architecture/Product-Roadmap-State.md) |
| No payment gateway on either billing relationship (clinic↔patient, platform↔clinic) | Medium, contingent on growth stage | Manual payment recording only. [Product-Roadmap-State.md §C1, §F1-F2](architecture/Product-Roadmap-State.md) |
| No payroll calculation engine in HR | Medium, contingent on product direction | `baseSalary` stored, nothing computes pay. [Product-Roadmap-State.md §D1](architecture/Product-Roadmap-State.md) |
| `packages/shared` contents never inspected in any documentation pass to date | **TODO/Unknown** | Not load-bearing for this map, but an open item for whoever next touches the monorepo build. |
| Pre-Phase-68 commit history does not use a "Phase N" label | **TODO/Unknown — do not guess** | See §11 below. |
| Whether `Allergy.deletedBy` is actually populated by current service code | **TODO/Unknown** | Schema has the column; not re-verified against `allergies.service.ts` in any pass. [Database Schema.md §6](architecture/Database%20Schema.md) |

## 11. TODO / Phase-History Note (do not guess)

This document's title references **"Phase 138A."** The most recently shipped feature work in git history is **Phase 147G** (HR Attendance & Leave UX polish). These two facts are not contradictory by themselves — phase numbers in this project are not necessarily a single strictly-increasing sequence across all work streams — but this map will **not guess** at a reconciliation. What is confirmed directly from `git log`:

- Explicit `Phase N` commit-message labels begin at **Phase 68** and run continuously to **Phase 147** (the current HEAD, commit `13890c4`).
- Commits before that point (roughly 362 of the repo's 542 total commits) use conventional-commit-style messages (`feat:`, `fix:`, `refactor:`) **without** a "Phase N" label, even though phase numbers below 68 are known to have existed conceptually — e.g. one squash commit is explicitly titled "phases 59-63," and project memory from prior sessions references Phases 55-60 by number in detail.
- **Conclusion:** phase numbering as a planning concept predates Phase 68, but is not reliably recoverable from commit messages alone for everything before that point. If a complete Phase 1-67 history is ever needed, it would have to be reconstructed from session memory/changelogs outside of git, not assumed from this repository alone.
- This document's own "Phase 138A" label is taken at face value from the user's task framing and is **not** assumed to slot chronologically between Phase 68-147 in the feature-numbering track. **Recommendation:** if documentation-track work (master maps, audits) and feature-track work (147-series, etc.) are meant to share one numbering sequence, that should be reconciled explicitly by whoever owns phase numbering — this document does not attempt to renumber anything.

## 12. Links to Detailed Architecture Docs

| Doc | Use it for |
|---|---|
| [System Architecture.md](architecture/System%20Architecture.md) | Component diagrams, auth/request flow, multi-tenancy model |
| [Modules.md](architecture/Modules.md) | Every backend module's dependencies, route prefix, role gates |
| [Database Schema.md](architecture/Database%20Schema.md) | Full ERD, every model/enum, schema-comment-derived design decisions |
| [Permissions Matrix.md](architecture/Permissions%20Matrix.md) | Role × endpoint grants (backend) + frontend permission constants |
| [API Map.md](architecture/API%20Map.md) | Endpoint inventory by module |
| [Frontend Structure.md](architecture/Frontend%20Structure.md) | Route tree, layout/guard chain, component map, i18n |
| [Deployment.md](architecture/Deployment.md) | Docker topology, nginx/TLS, backup scripts, runbook map |
| [Architecture Audit Report.md](architecture/Architecture%20Audit%20Report.md) | Verified findings on Redis, stub modules, employee documents |
| [Product-Roadmap-State.md](architecture/Product-Roadmap-State.md) | Full per-module classification with business value/complexity/priority |
| [PROJECT_MAP.mmd](PROJECT_MAP.mmd) | Visual system map (Mermaid) — companion to this document |

## 13. Recommendation for the Next 3 Phases

1. **Notifications Foundation.** Build a single, pluggable `NotificationsModule` (one channel first — SMS or email, whichever has lower integration cost for the target market) with delivery-status tracking. This is the highest-leverage next investment: it directly unblocks two existing gaps (Follow-up reminder delivery, Staff invite-flow) rather than being a standalone feature with its own adoption risk.
2. **Follow-up Reminder Delivery.** Wire the already-built reminder-tracking workflow (`FollowUpReminder`, status machine, patient-response recording) into the Notifications foundation from Phase 1. This converts an existing "looks done but isn't" gap into a real, valuable feature with comparatively little net-new design work — the data model and UI are already there.
3. **Audit Log Coverage Sweep + Redis Decision.** A focused, low-risk verification phase: (a) confirm or close any remaining mutating endpoints across the ~30 backend modules that lack an `AuditLogsWriterService` call, given this is a medical-records system where compliance matters; (b) make an explicit decision on Redis — either build the JWT-denylist feature it's provisioned for, or decommission the idle service from both compose files. Both halves are cheap, bounded, and reduce risk rather than add product surface — a good "tidy up before the next big push" phase.

Beyond these three, the next strategic conversation (not yet a phase) should be the **Inventory go/no-go decision** — it's named in the product's own architecture brief but has zero implementation, and that ambiguity should be resolved deliberately rather than left open indefinitely.
