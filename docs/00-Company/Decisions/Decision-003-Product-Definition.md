# Decision 003 — Product Definition

**Status:** Approved
**Last updated:** Phase 0B

## Purpose

States what Elaji Health *is*, as a single agreed definition, so the product doesn't drift into being several different things to different people.

## Decision

Elaji Health is a **complete Clinic Operating System for small and medium private clinics**. It combines administration, medical records, clinical workflows, billing, accounting-related workflows, HR, and reports in one platform.

The architecture should allow future expansion into a health platform with **unified patient medical records across clinics** — but this is an architectural allowance for the future, not a current commitment. See [Product-Scope.md](../Product-Scope.md) for what's actually being built now versus later.

## Why This Matters

"Clinic Operating System" is the deliberate framing — not "EMR," not "billing software," not "scheduling app." Those are individual pieces; the product is the combination, run as the clinic's single operational system. The cross-clinic patient-identity direction is named explicitly so that early architecture choices (e.g., how `Patient` and `ClinicPatient` already relate in the data model) aren't accidentally foreclosed, even though building that future is not a near-term goal.

## Related

- [Decision-001-Target-Customer.md](Decision-001-Target-Customer.md)
- [Decision-008-Product-Scope.md](Decision-008-Product-Scope.md)
- [../Vision.md](../Vision.md)
