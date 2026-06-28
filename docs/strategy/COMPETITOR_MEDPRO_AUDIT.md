# Competitor Audit: MedPro System

**Status:** Active reference document.
**Source:** Module inventory and screen observations from inspecting MedPro System screenshots (six reference videos/screenshot sets reviewed earlier in the Elaji gap-analysis track — see `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`). This document does not claim direct hands-on access to a live MedPro instance — it documents what was observed and turns it into strategic guidance, not a feature-for-feature reverse-engineering.

## 1. Context

MedPro appears to be a broad clinic/medical center ERP-style system. It covers patient management, visits, billing, inventory, reports, users, roles, and settings in one product — closer to a full clinic/hospital ERP than a focused clinical workflow tool. It is built for clinics and medical centers that want a single system covering both clinical operations and back-office/financial/inventory operations.

This matters for Elaji because MedPro is a direct or near-direct competitor in the same market segment (clinic/medical-center software), and its breadth is its main selling point — which is also, as detailed below, its main UX liability.

## 2. Observed Modules

Modules visible from the screenshots, grouped by area:

**Clinical / patient-facing**
- Dashboard / quick links
- Patient management
- Patient registration
- Visits
- Waiting list
- Appointments
- Lab requests
- Prescriptions

**Administration**
- User management
- Role packages / permissions

**Financial**
- Billing / accounting
- Patient payments
- Service payment requests
- Cashbox / daily cash reports
- Refunds / returned payments
- Doctor income reports
- Insurance claims

**Inventory / supply chain**
- Inventory
- Suppliers
- Purchase invoices
- Sales invoices
- Stock reports

**System configuration**
- System settings
- Clinics
- Visit types
- Medical service types
- Lab settings
- Health insurance settings
- Invoice templates
- WhatsApp settings
- Backups
- Tax settings
- Date and number formatting
- Custom patient card fields

## 3. Strengths of MedPro

- **Broad feature coverage** — one system spans clinical, financial, and inventory operations, reducing the need for a clinic to integrate multiple tools.
- **Strong administrative/financial scope** — cashbox/daily cash reports, refunds, doctor income reports, and insurance claims go deeper into clinic finance than a typical clinical-only product would.
- **Reports and accounting depth** — multiple report types observed (stock, cash, doctor income), suggesting real investment in back-office reporting.
- **Inventory support** — suppliers, purchase invoices, sales invoices, and stock reports are a full small supply-chain module, not a stub.
- **Configurable system settings** — visit types, medical service types, lab settings, health insurance settings, invoice templates, tax settings, and date/number formatting all suggest a system designed to be configured per clinic rather than hardcoded.
- **Trial/onboarding/help center presence** — the product appears to invest in self-service onboarding, which lowers the cost of customer acquisition and support load.
- **Suitable for clinics and medical centers that want an all-in-one system** — for a buyer who wants one vendor for everything (clinical + financial + inventory), MedPro's breadth is a real, legitimate strength, not just feature-count padding.

## 4. Weaknesses / Opportunities for Elaji

- **UI looks old and crowded** — dense, table-first screens rather than a guided, modern interface.
- **Workflow is not presented as a clean patient journey** — the patient's path through the system (register → visit → treatment → billing) is not visibly the organizing principle of the UI; modules read as a flat list of administrative screens instead.
- **Too many tables and dense controls** — screens favor exhaustive data tables over focused, task-oriented views.
- **User experience may require training** — density and table-heavy design imply a learning curve before staff are productive, which is a real cost for clinics with high staff turnover (a common reality in the markets Elaji targets).
- **Clinical workflow depth is not clearly visible from screenshots** — encounter documentation, clinical timeline, and structured clinical data don't show up as a clear strength in what was observed; the visible depth is administrative/financial/inventory, not clinical.
- **Security, audit logs, and tenant isolation are not visibly emphasized** — no observed screens foreground who-did-what auditability or multi-tenant data isolation as product features, even though these matter a great deal to a clinic evaluating a SaaS vendor with patient data.
- **Reports appear table-heavy rather than dashboard-driven** — reporting reads as "export-style" tables rather than at-a-glance, decision-supporting dashboards.

These are exactly the areas where Elaji's current architecture is already strong (see §6) — the opportunity is to make that strength visible and central, not to copy MedPro's breadth.

## 5. Elaji Strategic Positioning

Elaji should **not** become a clone of MedPro. Chasing MedPro's module count would mean competing on MedPro's terms (breadth, ERP completeness) instead of Elaji's actual strengths (architecture, clarity, modern engineering practice).

Elaji should compete as:

> **A modern, secure, workflow-first clinic operating system focused on clarity, speed, tenant isolation, auditability, and clean clinical journeys.**

Where MedPro wins on breadth, Elaji should win on depth-where-it-matters (the actual patient/clinical journey) and on trust signals (security, audit, isolation) that a table-heavy ERP doesn't visibly offer.

## 6. Feature Comparison Matrix

"Elaji current/target capability" reflects the verified, currently-implemented state of this codebase as of this audit (not aspirational claims) — see `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md` and `docs/elaji-planning/ELAJI_IMPLEMENTATION_ROADMAP.md` for the underlying detail this matrix draws from.

| Area | MedPro observed capability | Elaji current/target capability | Priority for Elaji | Decision |
|---|---|---|---|---|
| Patients | Patient management, registration, custom patient card fields | Implemented — full CRUD, MRN, duplicate detection, org-scoped patient links | Must-have now | Maintain; custom card fields deferred (Later) |
| Appointments | Appointments, waiting list | Implemented — full status lifecycle (8 states), booking/reschedule/cancel | Must-have now | Maintain |
| Queue | Waiting list | Implemented — check-in → ticket → status lifecycle | Must-have now | Maintain |
| Visits | Visits module | Implemented as `Encounter` (different name, equivalent/richer clinical fields) | Must-have now | Maintain; no separate "Visit" model needed |
| Encounters | Not a clearly distinct concept in MedPro's observed screens | Implemented — clinical detail (chief complaint, diagnosis, treatment plan), linked to prescriptions/labs/radiology/files/reports | Must-have now | This is a clinical-depth area to actively differentiate on |
| Prescriptions | Prescriptions module | Implemented, linked to Encounter; no reusable templates yet | Must-have now (core) / Soon (templates) | Maintain core; prescription templates remain a planned, not-yet-started roadmap item |
| Medical Timeline | Not visibly present as a concept in MedPro's screens | Implemented — derived-on-read patient timeline spanning clinical, financial, and service-request events | Must-have now | Actively market this — it's a differentiator MedPro doesn't appear to have |
| Billing | Billing/accounting, patient payments, service payment requests | Implemented — Invoice/InvoiceItem/Payment lifecycle, payment policies, service-request billing link | Must-have now | Maintain |
| Reports | Doctor income reports, stock reports, cash reports (table-heavy) | Implemented but narrower — billing report, cashier summary; not yet dashboard-rich | Soon | Invest in dashboard-style reporting, not table-dump reporting |
| Accounting | Cashbox/daily cash reports, refunds | Billing/payments exist; no general ledger, expense tracking, or full accounting | Later | Do not build full accounting until Healthcare Core MVP is strong |
| Inventory | Inventory, suppliers, purchase invoices, sales invoices, stock reports | Not implemented | Later | Explicitly deferred — see §9 |
| Users and roles | User management, role packages | Implemented — fixed role set (SUPER_ADMIN/ORG_ADMIN/DOCTOR/NURSE/SECRETARY/ACCOUNTANT/TECHNICIAN/BRANCH_ADMIN), not custom role-builder | Must-have now (fixed roles) / Later (custom role packages) | Fixed roles are sufficient for now; a custom role-builder is a later-stage, not urgent, feature |
| Permissions | Role packages / permissions screens | Implemented — `@Roles()` guard pattern enforced backend + frontend, consistently audited this session across every module added | Must-have now | Maintain as a strength, keep enforcing consistently on every new module |
| Audit logs | Not visibly present as a product feature in MedPro's screens | Implemented — dedicated audit-logs module + platform-facing UI page | Must-have now | Actively market this — a clear differentiator |
| Tenant isolation | Not visibly present as a product feature in MedPro's screens | Implemented — `organizationId` scoping enforced throughout, verified repeatedly | Must-have now | Actively market this — a clear differentiator |
| Help center / onboarding | Trial/onboarding/help center presence observed | Not implemented | Soon | Worth real investment — lowers support cost and improves first-clinic experience |
| WhatsApp integration | WhatsApp settings module observed | Not implemented | Later | Real future module, not urgent |
| Insurance | Health insurance settings, insurance claims | Only a payment-method tag exists (`PaymentMethod.INSURANCE`); no claims workflow | Later | Real future module, not urgent |
| Settings | System settings, invoice templates, tax settings, date/number formatting, backups UI | Implemented narrower — clinic/branch/service/visit-type settings exist; no invoice templates, tax settings, or in-product backups UI (backups exist as ops scripts, not a product feature) | Soon (invoice templates) / Later (tax settings, backups UI) | Expand settings incrementally, prioritized by what blocks a real clinic from onboarding |

## 7. What Elaji Should Copy Conceptually

- **Quick links by role** — a role-aware dashboard entry point, so each staff role lands on what's relevant to them rather than a generic landing page.
- **Help center / onboarding** — MedPro's visible investment here is a legitimate strength; Elaji currently has none and should close this gap.
- **Strong settings structure** — the breadth of MedPro's settings (visit types, service types, lab settings, invoice templates) shows real attention to "every clinic configures itself differently" — Elaji's settings should keep growing in this direction, but incrementally and only where it serves a real clinic need.
- **Better reports** — not MedPro's table-heavy style specifically, but the underlying idea that financial/operational reporting needs real investment, not just two report types.
- **Clear accounting roadmap** — MedPro shows what "full accounting" eventually looks like (cashbox, refunds, doctor income) — useful as a future reference point, not an immediate target.
- **Insurance and WhatsApp as future modules** — both are legitimate, real-world clinic needs; the right move is to plan for them, not ignore them, while not pulling them into the current build.

## 8. What Elaji Should NOT Copy

- **Crowded UI** — Elaji's UI should stay materially cleaner than what was observed in MedPro's screenshots.
- **Too many modules too early** — breadth-first is MedPro's strategy, not Elaji's; adding modules before the core workflow is excellent would dilute, not strengthen, Elaji's position.
- **Table-heavy UX everywhere** — tables have a place, but they should not be the default answer to every screen.
- **ERP complexity before core workflow is excellent** — MedPro reads as "do everything," Elaji should read as "do the clinical workflow exceptionally well first."
- **Adding inventory/accounting before clinic workflow is solid** — these are real, eventually-valuable modules, but building them now would compete with MedPro on MedPro's terms instead of playing to Elaji's actual strengths.

## 9. Recommended Roadmap Impact

**Recommended next focus: strengthen the Healthcare Core MVP before expanding to inventory or full accounting.**

Recommended workflow to keep excellent, in this order:

```
Patient → Appointment/Queue → Visit → Encounter → Prescription → Billing → Patient Timeline → Reports → Audit Logs
```

Every one of these steps already exists in Elaji today (confirmed via direct codebase inspection, not assumption) — the recommended impact is **depth and polish on this exact chain**, not new modules bolted onto it. Concretely, this means continuing the pattern already established this session (e.g. `MedicalServiceRequest`'s full lifecycle → billing link → timeline integration → work queue → QA/polish pass) for any remaining gaps in this chain, before opening new fronts like inventory, full accounting, insurance claims, or WhatsApp.

## 10. Product Rules Added From This Audit

- Do not chase competitor feature count blindly.
- Prioritize workflow quality over module quantity.
- Every new module must fit the patient journey or admin journey clearly.
- Keep Elaji visually cleaner and operationally simpler than MedPro.
- Make tenant isolation, audit logs, and security visible product strengths.
- Inventory and full accounting are later-stage modules, not immediate distractions.
