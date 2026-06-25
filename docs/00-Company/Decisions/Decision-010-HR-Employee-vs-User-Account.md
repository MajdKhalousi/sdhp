# Decision 010 — HR Employee Profile vs User Account

**Status:** Approved
**Last updated:** Phase 0C-C

## Purpose

Clarify the product distinction between an HR employee record and a system login account.

## Decision

Employee Profile and User Account are separate concepts.

Employee Profile represents HR/personnel data:
- salary
- contract
- attendance
- leave
- documents
- employment information

User Account represents system access:
- login credentials
- role
- permissions
- active/inactive access

An Employee Profile may optionally be linked to a User Account through `EmployeeProfile.userId`.

## Rationale

Not every employee needs system access. Not every login account needs an HR profile.

For example, a secretary or accountant may need login access; a payroll-only employee may not.

## Product Language

Use:
- "Employee Profile" for the HR/personnel record.
- "User Account" for login/access.
- Avoid using "staff" as a product term unless referring to legacy/code naming.

## Naming Note

Some code/UI layers use `staff`/`users`/`accounts` for the login-account concept, while `employees` refers to HR profiles. This is a naming inconsistency, not a structural duplication.

## Implications

- HR documentation should explain the difference clearly.
- Future UI labels should prefer "User Account" over "Staff" where possible.
- Permissions belong to User Accounts, not Employee Profiles.
- Payroll, attendance, leave, and documents belong to Employee Profiles.

## Related

- [../../01-Product/Product-Flows.md](../../01-Product/Product-Flows.md)
