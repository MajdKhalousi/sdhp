# MedPro Video Analysis — Index

Running index of all MedPro tutorial video analyses. Each row links to a structured note in this folder. See `../README.md` for the rules governing this research area before adding entries.

## How to add a new video analysis

1. Copy the template structure below into a new file in this folder, named descriptively, e.g. `video-01-patient-registration.md`.
2. Fill in every section using only what was explicitly shown in the video. Mark anything unclear as an **Open Question**.
3. Add a row to the table below linking to the new file.
4. If the video surfaces new entities, workflows, permissions, or reports, consider whether `../extracted-blueprints/` should be updated to reflect the synthesized, cross-video view — but do not edit `extracted-blueprints/` files in the same pass as the raw note without a clear reason; raw notes and synthesized blueprints are separate steps.

## Per-video note template

```markdown
# Video: <title>

- **Video link:** <url>
- **Module:** <e.g. Patients / Appointments / Queue / Billing / Lab / Pharmacy / ...>
- **Date analyzed:** <date>

## Screens / pages shown
-

## Actions
-

## Fields
-

## Statuses
-

## Business rules
-

## Entities
-

## Relations
-

## Permissions implied
-

## Reports / outputs
-

## Elaji relevance
-

## Open questions
-
```

## Index

| # | Video Title | Module | File | Status |
|---|---|---|---|---|
| 1 | MedPro Clinic Management System - Reservation & Patient Flow Module | Appointments, Visits, Queue, and Payment Requests | [01-reservation-patient-flow.md](01-reservation-patient-flow.md) | Draft with screenshots reviewed (Priority: High) |
| 2 | 11 - تعريف أنواع الزيارات (MedPro) | Settings / Visit Types Configuration | [02-visit-types.md](02-visit-types.md) | Draft with screenshots reviewed (Priority: High) |
| 3 | 12 - تعريف أنواع الخدمات الطبية (MedPro) | Settings / Medical Service Types Configuration | [03-medical-service-types.md](03-medical-service-types.md) | Draft with screenshots reviewed (Priority: High) |
| 4 | 13 - طلب وتنفيذ الخدمات الطبية للمرضى (MedPro) | Patient File / Medical Service Requests | [04-patient-file-medical-service-requests.md](04-patient-file-medical-service-requests.md) | Draft with screenshots reviewed (Priority: High) |
| 5 | 14 - تعريف مريض جديد (MedPro) | Patients / Patient Registration | [05-patient-registration.md](05-patient-registration.md) | Draft with screenshots reviewed (Priority: High) |
| 6 | Clinic settings - patient file field configuration | Settings / Clinic Patient File Configuration | [06-clinic-patient-file-field-settings.md](06-clinic-patient-file-field-settings.md) | Draft with screenshots reviewed (Priority: High) |

*Rows are added in sequential order (oldest first) as videos are analyzed — keep this convention for all future entries.*
