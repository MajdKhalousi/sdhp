# Product Scope

**Last updated:** Phase 0B
**Source:** [Decision-008-Product-Scope.md](Decisions/Decision-008-Product-Scope.md)

## Purpose

This document defines what Elaji Health *is* today, what's planned next, what's a longer-term strategic direction, and what is explicitly not being built right now. Use this to judge whether a proposed feature belongs in the current roadmap at all.

## Current Definition

Elaji Health is currently a **Clinic Operating System for small and medium private clinics**. It focuses on daily clinic operations from reception to doctor to invoice to reporting, with basic HR and administration support.

## Core Scope (current product scope; build status varies)

| Area | Includes |
|---|---|
| Identity & Access | Auth and user accounts, Employees and user management, Permissions, Audit logs |
| Patients | Patients, Allergies, Medical timeline |
| Scheduling | Appointments, Queue / Check-in, Doctor schedules |
| Clinical | Doctor workspace, Encounters / visit records, Prescriptions, Labs, Radiology, Medical files, Clinical reports |
| Financial | Billing / invoicing, Payments, Cashier, Reports |
| Configuration | Clinic settings, Visit types, Services |
| HR | HR, Attendance, Leave, Payroll |
| Platform | Platform / Super Admin |

For exact build status per item, see [../01-Product/Product-Inventory.md](../01-Product/Product-Inventory.md).

## Near-Term Scope (next priorities, not yet built or not yet complete)

- Real notifications
- Follow-up reminders with an actual sending mechanism
- BRANCH_ADMIN role clarification
- Permissions Matrix improvement
- Documented product flows
- QA checklist
- Queue display screen
- Better administrative reports
- First clinic usability improvements

## Strategic Scope (longer-term direction, not scheduled)

- Inventory / Stock Management
- Pharmacy
- Offline-first local clinic server
- Advanced multi-branch management
- Patient portal
- Patient mobile access
- Unified patient medical record across clinics
- Inter-clinic data sharing with patient consent
- AI assistant
- Insurance
- Advanced accounting
- Enterprise hospital support

## Out of Scope Now (explicitly not being pursued)

- Full national health platform
- Ministry integrations
- Large hospital system
- Diagnostic medical AI
- Doctor/patient marketplace
- Full mobile app
- Support for every type of medical facility
- Medical device integrations
- Full telemedicine platform
- Generic ERP outside healthcare

## How to Use This Document

If a proposed feature isn't in **Core** or **Near-Term**, it needs a deliberate scope decision before it gets scheduled — it doesn't get built just because it's technically interesting or was mentioned somewhere. **Strategic Scope** items are real future direction, not a backlog to start pulling from opportunistically. **Out of Scope Now** items should be actively declined if proposed, not quietly absorbed.

## Related

- [Vision.md](Vision.md)
- [../01-Product/Product-Inventory.md](../01-Product/Product-Inventory.md) — what's actually built within Core Scope today
