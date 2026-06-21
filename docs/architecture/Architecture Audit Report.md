# Architecture Audit Report

**Date:** 2026-06-21
**Scope:** Validate the TODO/Unknown items raised in the initial `docs/architecture` documentation pass. Documentation only — no code changes.
**Method:** Direct file inspection (folder listings, dependency manifests, controller source) rather than agent-summarized research. Every finding below cites the exact file(s) read.

## Summary Table

| # | Item | Prior status | Audited status |
|---|---|---|---|
| 1 | Redis usage | TODO/Unknown | **Confirmed: provisioned, not consumed by any application code** |
| 2 | `notifications` module | "reported as stub" | **Confirmed: empty (.gitkeep only)** |
| 3 | `ai-assistant` module | "reported as stub" | **Confirmed: empty (.gitkeep only)** |
| 4 | `staff` module | "reported as stub" | **Confirmed: empty (.gitkeep only)** |
| 5 | `rooms` module | "reported as stub" | **Confirmed: empty (.gitkeep only)** |
| 6 | Employee document upload | "foundation only, no upload endpoint" (per schema comment) | **Confirmed: fully implemented; the schema comment is stale** |

A sixth folder, `staff-scheduling`, was also checked while verifying #4/#5 (it was mentioned alongside them in the original docs) and is **also confirmed empty (.gitkeep only)**.

---

## 1. Redis Usage — RESOLVED: Not Consumed

**Question:** Is Redis actively used by the API, or only provisioned in Docker for a future feature?

**Findings:**
- `apps/api/package.json` has **no dependency** on `redis`, `ioredis`, `@nestjs/redis`, or `cache-manager` (or any cache-manager Redis store package). Checked directly.
- A codebase-wide case-insensitive search for `redis` in `apps/api/src` returns exactly **2 files**, both comments, no executable code:
  - `apps/api/src/modules/auth/auth.service.ts:77` — `// Server-side token revocation is deferred — requires Redis denylist integration.`
  - `apps/api/src/modules/auth/auth.controller.ts:55` — Swagger `@ApiOperation` description: `'Server-side token revocation is deferred (pending Redis denylist). The client is responsible for deleting the JWT. Token lifetime is limited to 24 h in production.'`
- No `RedisModule`, no `CacheModule`, no queue library (BullMQ, etc.) referencing Redis anywhere in `apps/api/src`.

**Conclusion:** Redis is **infrastructure-in-waiting**. It runs in both `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod, with `--requirepass`) but the application never connects to it. Its sole purpose today is to be ready for the planned JWT/logout-revocation feature referenced in project memory as "Phase 136D — Redis token denylist for real logout revocation, post-pilot" — which has not been built. Logout today is purely client-side (client discards the JWT; server does nothing beyond an audit-log entry).

**Risk/Note:** Running and password-protecting a service that nothing uses is harmless but is unnecessary attack surface and operational overhead (backup/monitoring effort for an idle container). Not a correctness issue — flagging for awareness only.

**Docs updated:** [System Architecture.md](System%20Architecture.md) §2, §9; [Deployment.md](Deployment.md) §2.

---

## 2-5. Stub Modules — RESOLVED: All Confirmed Empty

**Question:** Do `notifications`, `ai-assistant`, `staff`, `rooms` (and `staff-scheduling`, checked incidentally) contain any real implementation, or are they empty placeholders?

**Method:** Listed every file in each folder directly:

```
apps/api/src/modules/notifications/        -> .gitkeep only
apps/api/src/modules/ai-assistant/         -> .gitkeep only
apps/api/src/modules/staff/                -> .gitkeep only
apps/api/src/modules/rooms/                -> .gitkeep only
apps/api/src/modules/staff-scheduling/     -> .gitkeep only
```

Then confirmed none of the five folder names appear anywhere in `apps/api/src/app.module.ts` (case-insensitive grep, zero matches) — so even if any of them gained a stray file, nothing wires it into the running application today.

**Conclusion:** All five are **confirmed zero-implementation placeholders** — not partially built, not registered, not reachable by any HTTP route. This matches and strengthens the prior documentation's hedge ("reported by this session's exploration," "re-verify directly") — the re-verification now makes it a fact rather than a research-agent claim.

Functional equivalents that *do* exist elsewhere in the codebase, for context:
- "Staff scheduling" → implemented inside `EmployeesModule` (`AttendanceController`, `LeaveController`), not a standalone module.
- "Staff" (accounts) → implemented inside `UsersModule` (`/users` CRUD) and the frontend's HR pages (`/dashboard/hr/accounts`, which is itself a redirect target for the old `/dashboard/settings/staff` stub page — see [Frontend Structure.md](Frontend%20Structure.md)).
- "Rooms" → no equivalent found anywhere in the codebase under any other name. If physical-room/resource scheduling is a planned feature, it has not started.
- "AI Assistant" → no equivalent found anywhere in the codebase under any other name.
- "Notifications" → no in-app notification delivery mechanism found anywhere (consistent with the Follow-ups module only queuing reminders without a send mechanism, noted separately in [Modules.md](Modules.md)).

**Docs updated:** [System Architecture.md](System%20Architecture.md) §5, §9; [Modules.md](Modules.md) (dependency table + closing section); [API Map.md](API%20Map.md) (closing section).

---

## 6. Employee Document Upload — RESOLVED: Implemented (schema comment is stale)

**Question:** Is there an upload endpoint for `EmployeeDocument`, or is it schema-only ("foundation only — no upload endpoint yet" per a comment in `schema.prisma:457`)?

**Findings:** Read `apps/api/src/modules/employees/employees-documents.controller.ts` in full. It defines a complete presigned-URL upload flow on `@Controller('employees/:employeeProfileId/documents')`:

| Method | Path | Roles | Behavior |
|---|---|---|---|
| POST | `upload-url` | SUPER_ADMIN, ORG_ADMIN | Returns a presigned PUT URL for direct-to-storage upload |
| POST | (root) | SUPER_ADMIN, ORG_ADMIN | Registers document metadata after the client uploads the bytes; `uploadedById` auto-resolved from JWT; 409 on duplicate `storageKey` |
| GET | (root) | SUPER_ADMIN, ORG_ADMIN | Lists non-deleted documents for an employee profile |
| GET | `:documentId/download-url` | SUPER_ADMIN, ORG_ADMIN | Short-lived presigned download URL |
| DELETE | `:documentId` | SUPER_ADMIN, ORG_ADMIN | Soft-delete; underlying storage object retained |

This mirrors the `MedicalFile`/`StorageService` presigned-URL pattern exactly as the original `schema.prisma` comment predicted it would ("Mirrors the MedicalFile/StorageService presigned-URL pattern that will be reused later") — the feature described as future work has since been built, but the schema comment was never updated to reflect that.

An in-code comment in the controller also documents a deliberate access decision not previously captured anywhere: **ACCOUNTANT has zero access to employee documents**, even though ACCOUNTANT can read `EmployeeProfile` records elsewhere — because documents "may include ID scans and contracts, not just salary data ACCOUNTANT legitimately needs." This is a privacy-conscious permission split worth preserving in the Permissions Matrix.

**Conclusion:** The feature is **fully implemented**. The `schema.prisma:457` comment is **outdated documentation debt** — a real, low-risk but worth-flagging inconsistency between code comments and actual code.

**Docs updated:** [Database Schema.md](Database%20Schema.md) §4 (Employee/HR), §5; [Modules.md](Modules.md) (Employees/HR section); [API Map.md](API%20Map.md) (Employees/HR routes).

---

## Recommendations (documentation/process only — no code changes proposed)

1. **Fix the stale schema comment** at `schema.prisma:457` the next time that file is touched for any reason — it actively misleads readers about a shipped feature. (Not changed in this pass per "no code changes" instruction.)
2. **Add ACCOUNTANT-excluded-from-documents** to [Permissions Matrix.md](Permissions%20Matrix.md) as an explicit row — it's a real, deliberate access-control decision that wasn't captured in the original matrix because the document-upload endpoints weren't enumerated with full role detail.
3. **Decide the fate of the 5 empty module folders.** Either remove them (if abandoned) or track them as a real backlog (if planned) — right now they read as ambiguous signals to anyone exploring the codebase fresh, including future documentation/audit passes that have to re-verify them from scratch each time.
4. **Decide whether to decommission Redis** from both compose files until the token-denylist feature is actually built, or keep it provisioned intentionally — currently it's a password-protected service running in production with zero consumers, which is a minor but avoidable footprint.

## Items Still Open (out of scope for this audit, carried forward unchanged)

These were not part of the 6 requested verification tasks and remain as originally flagged:
- `packages/shared` contents/usage — not inspected.
- Whether `Allergy.deletedBy` is actually populated by current service code ([Database Schema.md](Database%20Schema.md) §6).
- Exact migration-to-environment history ([Database Schema.md](Database%20Schema.md) §6).
- Whether Follow-up reminders are ever actually *sent* via SMS/WhatsApp/Email, or only ever queued ([Modules.md](Modules.md), Followups section).
- Live state of the production cron schedule ([Deployment.md](Deployment.md) §9).
