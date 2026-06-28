# Video: 13 - طلب وتنفيذ الخدمات الطبية للمرضى (MedPro)

- **Video link:** https://www.youtube.com/watch?v=35i_VJBv7qU
- **Module:** Patient File / Medical Service Requests
- **Priority:** High
- **Status:** Draft with screenshots reviewed
- **Date analyzed:** 2026-06-28

> Per `../README.md`: this note documents only what was explicitly shown in this video's screenshots. Anything not directly observed is listed separately under **Inferred / Not Yet Confirmed**, not mixed into the confirmed sections below. Nothing here is an Elaji commitment.

## Screens / pages shown

- Patient file screen, with a header and a set of tabs.
- Visits tab (within the patient file).
- Dental chart tab (within the patient file).
- Medical services tab (within the patient file).

## Actions

- Patient file header: Edit, New appointment.
- Visits tab: Register new visit.
- Visit row: expand to show clinical visit details.
- Medical services tab: Request service (button); Apply discount (checkbox).

## Fields

**Patient file header (identity/demographic data):**
- File number
- Patient name
- Registration date
- Nationality
- City
- Blood type
- Social status
- Gender
- Age
- Phone number
- Financial obligations indicator

**Patient file tabs (exact, as shown):**
- التاريخ المرضي (Medical history)
- خطة العلاج (Treatment plan)
- النماذج (Forms)
- مخطط الأسنان (Dental chart)
- الخدمات الطبية (Medical services)
- التحاليل (Lab tests)
- الوصفات الطبية (Prescriptions)
- التقارير الطبية (Medical reports)
- الزيارات (Visits)
- الملفات (Files)
- دفعات متبقية (Remaining payments)

**Visits tab — new-visit controls:** Visit type, Medical condition/category, Clinic.

**Visits tab — table columns:** File number, Patient name, Date, Time, Waiting time, Visit type, Medical condition/category, Clinic, Payment status, Visit status, Previous appointment (yes/no), Action.

**Visit row expanded (clinical details):** Main complaint, Primary diagnosis, Secondary diagnosis, Notes.

**Dental chart tab components:**
- Tooth chart with teeth numbered 1–32
- Full mouth checkbox
- Tooth/procedure status selector
- Categorized dental procedures list
- Lower table for dental procedures
- Procedure status legend with colors/states

**Dental procedure categories observed:**
- تنظيف وتبييض الأسنان (Cleaning & whitening)
- الحشوات (Fillings)
- التيجان والجسور (Crowns & bridges)
- قناة الجذر (Root canal)
- القلع والجراحات (Extractions & surgery)
- الزرع (Implants)

**Medical services tab — request controls/fields:** Service date, Medical service type selector, Doctor selector, Notes, Apply discount checkbox, Request service button.

**Medical services tab — table columns:** File number, Patient name, Request date, Requested by, Doctor, Service, Notes, Payment status, Executed (yes/no), Action.

## Statuses

- Visit status and Payment status columns appear again here, consistent with video 01 (only "waiting" and "unpaid" were confirmed there; no new values confirmed in this video).
- Medical service request: a "Payment status" column and an "Executed?" column both exist as separate fields — confirming service-request payment state and execution state are tracked separately. Exact values for either were not shown (see Open Questions).
- Dental procedures have a "status legend with colors/states," but the specific status names/colors were not individually captured.

## Business rules

- Medical services can be requested from within the patient file.
- A medical service request is associated with a patient.
- A medical service request is associated with a request date.
- A medical service request can be associated with a doctor.
- A medical service request has a payment status.
- A medical service request tracks whether it has been executed/performed, as a field distinct from payment status.
- The patient file acts as a central workspace linking visits, medical services, labs, prescriptions, reports, files, payments, dental chart, treatment plan, and medical history — all as tabs within one patient file screen.
- Visit clinical details (main complaint, primary/secondary diagnosis, notes) can be stored under a visit record, accessible by expanding the visit row.

## Entities

- **PatientFile / PatientProfile** — the header fields above (file number, name, registration date, nationality, city, blood type, social status, gender, age, phone, financial obligations indicator) plus the tab set.
- **Visit** — as in video 01, with an additional confirmed sub-structure: **VisitClinicalDetails** (main complaint, primary diagnosis, secondary diagnosis, notes), shown on row expansion.
- **MedicalServiceRequest** — file number, patient, request date, requested by, doctor, service, notes, payment status, executed flag.
- **DentalChart** / **DentalProcedure** — tooth chart (1–32), full-mouth flag, procedure status, procedure category, procedure status legend.
- Tab names also imply (not detailed in this video beyond the tab existing): Prescription, LabRequest/LabTest, MedicalReport, Attachment/File, Payment/DuePayment, TreatmentPlan.

**Potential data entity shape** (draft sketch derived from the observed fields above, not a confirmed schema and not an Elaji commitment):

```
MedicalServiceRequest
  id
  patientId
  visitId           nullable
  appointmentId     nullable
  medicalServiceId
  requestDate
  requestedByUserId
  doctorId          nullable
  notes
  discountApplied   boolean
  paymentStatus
  executionStatus / executed   boolean
  createdAt
  updatedAt
```

## Relations

- PatientFile → Visit, MedicalServiceRequest, DentalChart, and the other tabbed records — all scoped to one patient.
- MedicalServiceRequest → MedicalService (the catalog entity confirmed in video 03) — a request selects from the configured service types.
- MedicalServiceRequest → Doctor (optional selector, exact required/optional state not confirmed).
- Visit → VisitClinicalDetails (one-to-one or one-to-many not confirmed — only that clinical detail fields exist under an expanded visit row).
- This builds directly on the "Request medical service" action already noted from the appointment edit modal in video 01 and the service catalog from video 03 — this video shows where/how that request actually gets created (from the patient file's Medical Services tab) rather than necessarily from the appointment modal itself; whether both entry points exist or only one was actually exercised is not confirmed (see Open Questions).

## Permissions implied

None directly observed. No role/permission distinction was shown for who can edit the patient file, request a service, apply a discount, or mark a service executed — see Open Questions.

## Reports / outputs

None observed directly in this video (the "Medical reports" and "Files" tabs exist as navigation targets, but their content was not shown).

## Elaji relevance

- Elaji's patient profile should become the central workspace for patient-related clinical, financial, and operational records, mirroring this tabbed-file pattern.
- Elaji should keep Patient, Visit, MedicalServiceRequest, LabRequest, Prescription, Report, Attachment, and Payment records connected through the patient timeline.
- Elaji should support requesting medical services from the patient profile, and possibly later from the appointment/encounter workflow as well.
- Elaji should separate service-request status from payment status, as two distinct fields, consistent with what's confirmed here.
- Elaji should treat the dental chart as a later, specialized module — not part of general MVP scope.
- Elaji should support discounts carefully, with permissions and audit logging.
- Elaji should snapshot service name/price into financial/payment records at the time a service request is created.
- Medical service requests should be tenant-scoped and patient-scoped.

*(Note: this section records observations for later roadmap discussion. None of the above is a committed Elaji decision — that determination belongs in `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`, not here.)*

## Risks and Edge Cases

These are risk considerations raised by this video's content, not confirmed MedPro behavior:

- A service requested without payment.
- A service marked as executed while still unpaid.
- A service cancelled after payment.
- A service paid but never executed.
- A discount applied without the appropriate permission.
- The doctor field changed after a service request already exists.
- The patient file exposing financial data to unauthorized roles.
- Dental-specific complexity increasing MVP scope unnecessarily.
- A historical service request breaking if the underlying service catalog item changes later.
- Tenant isolation across patient file tabs.

## Inferred / Not Yet Confirmed

These were not directly shown in the video and must not be treated as confirmed MedPro behavior:

- Whether service requests can be created from the appointment edit modal, the visit screen, an encounter screen, or all of them.
- Whether requesting a service automatically creates a payment request.
- Whether service execution is blocked until paid.
- The exact service-request status values.
- The exact execution workflow (e.g. requested → in progress → completed).
- Whether a nurse/technician execution dashboard exists.
- Whether quantity is supported on a service request.
- Whether medical services can consume inventory items.
- Whether service requests create invoice line items directly.
- Whether service results or templates are generated after execution.
- Whether discounts on medical services require a special permission.
- Whether the doctor field on a service request is required.
- Whether service execution prints a voucher or receipt.

## Open questions

- What are the exact service request statuses?
- Is "Executed?" a boolean or a multi-state workflow?
- Does requesting a service automatically create a payment request?
- Does service execution require prior payment?
- Can one request include multiple services?
- Is the doctor selector required?
- Who is "Requested by" in the medical services table — the logged-in user, or a separately selected staff member?
- Is the discount applied as a fixed amount or a percentage?
- Where is the discount amount entered after checking "Apply discount"?
- Can the same service be requested multiple times for the same patient on the same day?
- Does a service request belong to a specific visit, or can it exist independently of one?
- Are service requests shown in a unified patient timeline?
- What actions are available in the medical services table (only "Action" was visible as a column header, contents not captured)?
- What happens if a service is cancelled after payment?
- What permissions are required to apply a discount or to execute a service?
