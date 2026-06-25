# Feature Matrix

**Last updated:** Phase 0B
**Source:** Phase 0A codebase inspection

## Purpose

Feature-level detail within each module, with status, so a question like "do we support X" can be answered precisely instead of at the whole-module level.

## Patients

| Feature | Status | Notes |
|---|---|---|
| Patient CRUD with auto-MRN | Complete | |
| Cross-clinic patient linking (verification-code flow) | Complete | `ClinicPatient` model + link-request/verify flow |
| Allergies (with severity) | Complete | Nested under patient profile |
| Same-clinic duplicate-phone detection | Complete | Corrected, Phase 0B-F1: `GET /patients/check-duplicate` matches on name, national ID, and phone suffix (last 9 digits); called from the patient-creation flow via `useCheckDuplicatePatient()` in `dashboard/patients/page.tsx`. Phase 0A had incorrectly marked this Not Started — not relisted as near-term scope, since [Product-Scope.md](../00-Company/Product-Scope.md) never actually listed it there. |

## Appointments / Queue

| Feature | Status | Notes |
|---|---|---|
| Booking + status lifecycle | Complete | |
| Double-booking prevention | Complete | `ConflictException` thrown in `appointments.service.ts` when a requested slot overlaps an existing appointment for that doctor |
| Walk-in / check-in / ticketing | Complete | |
| Next-available-slot suggestion | Complete | Corrected, Phase 0B-F1: a dedicated `AvailableSlotsPicker` component (`components/appointments/available-slots-picker.tsx`), backed by `GET /doctors/:doctorId/available-slots`, is wired into the main appointment form. Phase 0A had incorrectly marked this Not Started, based on friction encountered creating appointments directly via API in a separate testing phase, not from testing the actual frontend UI. |

## Clinical

| Feature | Status | Notes |
|---|---|---|
| Encounter documentation | Complete | |
| Prescriptions | Complete | Encounter-scoped, no standalone page (by design) |
| Lab order → result → review | Complete | |
| Radiology order → report → review | Complete | |
| Medical file upload/attachment | Complete | |
| Clinical report (PDF) | Complete | |
| Medical timeline (read-only history) | Complete | |

## Billing

| Feature | Status | Notes |
|---|---|---|
| Invoice lifecycle (DRAFT→ISSUED→PAID/CANCELLED) | Complete | |
| Cashier view / daily reconciliation | Complete | |
| Billing report | Complete | |
| Clinical-role invoice scoping (DOCTOR/NURSE see only their own clinical scope) | Complete | Shipped and production-verified |
| Online/card payment gateway | Not Started | Manual payment recording only |

## HR / Payroll

| Feature | Status | Notes |
|---|---|---|
| Employee profiles | Complete | |
| Attendance | Complete | Manual entry only, no biometric/device integration |
| Leave requests | Complete | |
| Employee documents | Complete | |
| Payroll runs (DRAFT→APPROVED→PAID) | Complete | Bookkeeping only — no real payment execution |

## Follow-ups & Reminders

| Feature | Status | Notes |
|---|---|---|
| Reminder scheduling | Complete | |
| Status tracking / patient-response recording | Complete | |
| Actual message sending (SMS/WhatsApp/Email) | **Not Started** | No code path found; depends on the empty `notifications` module |

## Platform / Super Admin

| Feature | Status | Notes |
|---|---|---|
| Clinic (tenant) onboarding | Complete | Atomic org + branch + first admin |
| Subscription status tracking | Complete | Manual status field, no billing automation |
| Cross-clinic audit log access | Complete | SUPER_ADMIN only |

## Not Started (named, zero implementation)

| Capability | Notes |
|---|---|
| Notifications delivery | Empty module — see [Product-Inventory.md](Product-Inventory.md) |
| AI Assistant | Empty module |
| Rooms / Resource Scheduling | Empty module |
| Inventory / Stock Management | No footprint anywhere |

## Candidate Gaps Requiring Verification

This section exists for claims whose evidence is too weak to confidently mark Complete or Not Started. As of Phase 0B-F1, the three rows flagged for review (same-clinic duplicate-phone detection, next-available-slot suggestion, double-booking prevention) were checked directly against code and **all three had strong, direct evidence** — two corrected from an incorrect "Not Started" to "Complete," one confirmed as already-correctly "Complete." None currently qualify for this section. It is retained as a standing place for genuinely weak-evidence claims surfaced in future reviews, rather than being deleted.

## Quality / Verification Notes

Notes on confidence/coverage that are not themselves product features and shouldn't be read as such:

| Item | Note |
|---|---|
| Payroll automated test coverage | No backend test file (`*.spec.ts`) found for the Payroll module, unlike most other modules in this codebase, which cite specific test counts. A confidence gap, not a confirmed functional defect. |

## Related

- [Product-Inventory.md](Product-Inventory.md)
- [Modules.md](Modules.md)
