# Decision 009 — Reception Daily Command Center

**Status:** Approved
**Last updated:** Phase 0C-C

## Purpose

Document which screen is the primary daily working screen for the receptionist/secretary.

## Decision

Today Hub is the primary daily command center for receptionist/secretary workflow.

Appointments remains the appointment management, search, planning, and detail area.

## Rationale

Today Hub combines appointment, patient, doctor, queue, encounter, invoice, and payment context in one daily operational view.

Appointments is better suited for appointment listing, filtering, creation, planning, and historical/future browsing.

## Implications

- Training should tell receptionists to start the day from Today Hub.
- Appointments remains important, but not the primary live-operation screen.
- Future reception UX improvements should prioritize Today Hub first.

## Evidence

- `/dashboard/today` — joins appointment + patient + doctor + queue + encounter + invoice per row, with inline check-in, advance-queue, start-encounter, and payment-collection actions.
- `/dashboard/appointments` — status filtering across all statuses, pagination, and the appointment-creation entry point; no queue/encounter/invoice join.
- Sidebar ordering (`apps/web/src/components/layout/sidebar.tsx`) places Today before Appointments in the navigation array.
- Phase 0C-B confirmed this matches current UI/code — this decision documents an existing de facto arrangement, not a proposed change.

## Related

- [../../01-Product/Product-Flows.md](../../01-Product/Product-Flows.md)
