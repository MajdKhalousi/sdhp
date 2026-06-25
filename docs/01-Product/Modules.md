# Modules

**Last updated:** Phase 0B

## Purpose

A short reference for what each product module does, at the level a new team member or stakeholder needs — not implementation detail. For technical detail (controllers, services, exact routes), see `../architecture/Modules.md` and `../architecture/API Map.md`.

## Module Reference

| Module | What it does |
|---|---|
| **Auth & Users** | Staff login (by phone), session handling, account management |
| **Patients** | Patient records, demographics, allergies, cross-clinic patient linking |
| **Appointments** | Booking, scheduling, appointment lifecycle |
| **Queue / Check-in** | Walk-in and scheduled check-in, daily ticketing |
| **Doctor Scheduling** | Doctor weekly availability and exceptions (holidays, custom hours) |
| **Encounters** | The clinical visit record — complaint, diagnosis, vitals, treatment plan |
| **Prescriptions** | Medication prescribing, scoped to an encounter |
| **Labs** | Lab order → result → review workflow |
| **Radiology** | Radiology order → report → review workflow |
| **Medical Files** | Document/file attachments (scans, referrals, consent forms) |
| **Clinical Reports** | Formal exportable clinical documentation (PDF) |
| **Allergies** | Patient allergy records with severity |
| **Medical Timeline** | Read-only aggregated history of everything that's happened to a patient |
| **Billing / Invoicing** | Invoice lifecycle, line items, payments, cashier reconciliation |
| **Reports** | Operational and financial analytics |
| **Clinic Settings** | Working hours, timezone, visit types, services catalog |
| **HR** | Employee profiles, attendance, leave, employee documents |
| **Payroll** | Payroll run generation and approval — bookkeeping only, no real payment execution |
| **Platform / Super Admin** | Clinic (tenant) onboarding, subscription status, cross-clinic audit logs |
| **Audit Logs** | Record of who did what and when, across the system |
| **Follow-ups & Reminders** | Reminder scheduling and tracking — see [Product-Inventory.md](Product-Inventory.md) for the sending-mechanism gap |

## Not Yet Real Modules

`Notifications`, `AI Assistant`, `Rooms`, `Inventory/Stock Management` are named in product discussion but have no implementation. See [Product-Inventory.md](Product-Inventory.md) for exact evidence.

## Related

- [Product-Inventory.md](Product-Inventory.md)
- [Feature-Matrix.md](Feature-Matrix.md)
- [../02-Architecture/README.md](../02-Architecture/README.md)
