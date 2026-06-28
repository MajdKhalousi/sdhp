# Video: 14 - تعريف مريض جديد (MedPro)

- **Video link:** https://www.youtube.com/watch?v=2vC-1B0Yd3o
- **Duration:** 05:44
- **Module:** Patients / Patient Registration
- **Priority:** High
- **Status:** Draft with screenshots reviewed
- **Date analyzed:** 2026-06-28

> Per `../README.md`: this note documents only what was explicitly shown in this video's screenshots. Anything not directly observed is listed separately under **Inferred / Not Yet Confirmed**, not mixed into the confirmed sections below. Nothing here is an Elaji commitment.

## Screens / pages shown

- New patient registration screen (تسجيل مريض جديد).
- Patients list screen.
- Patient card / info print preview (بطاقة مريض).

## Actions

- New patient registration: photo upload, photo capture, إضافة (Add), إلغاء (Cancel).
- Patients list: register new patient; filter by branch; search by patient name or phone; search by file number.
- Patient row operations: تعديل (Edit), ملف المريض (Patient file), تسجيل زيارة (Register visit), plus additional small icons whose exact meaning was not confirmed from the screenshot.

## Fields

**Personal photo area:** upload button, capture photo button.

**Personal/demographic fields (exact, as shown):**
- رقم الملف (File number)
- الفرع (Branch)
- تاريخ التسجيل (Registration date)
- الاسم الأول (First name)
- الاسم الثاني (Second name)
- الاسم الأخير (Last name)
- الاسم الكامل (Full name)
- تاريخ الميلاد (Date of birth)
- العمر سنة (Age — years)
- العمر شهر (Age — months)
- العمر يوم (Age — days)
- الجنس (Gender)
- رقم الهاتف (Phone number)
- البريد الإلكتروني (Email)
- العنوان (Address)
- الجنسية (Nationality)
- المدينة (City)
- وثيقة التعريف (Identity document type)
- رقم وثيقة التعريف (Identity document number)
- زمرة الدم (Blood type)
- الحالة الاجتماعية (Marital/social status)
- قناة التسويق (Marketing channel)
- اسم الأم (Mother's name)
- التخصص (Specialty/profession)
- المرافق (Companion)
- ملاحظات (Notes)

**Health insurance section fields:**
- شركات التأمين (Insurance companies)
- الخطة (Plan)
- تاريخ البداية (Start date)
- صالح حتى (Valid until)
- رقم التأمين (Insurance number)
- المرافقة / الصفة (Relationship/coverage role) — observed value "نفسه" (self)

**Patients list table columns:** اسم المريض (Patient name), رقم الملف (File number), تاريخ التسجيل (Registration date), المدخل (Entered by), الحالة (Status), العملية (Action).

**Patient card / print preview fields:** رقم الملف, الفرع, تاريخ التسجيل, الاسم الأول, الاسم الثاني, الاسم الأخير, تاريخ الميلاد, العمر, الجنس, رقم الهاتف, اسم الأم, التخصص, الجنسية, المدينة, الحالة الاجتماعية, زمرة الدم, العنوان, البريد الإلكتروني, وثيقة التعريف, رقم وثيقة التعريف, ملاحظات.

## Statuses

- Patients list has a الحالة (Status) column. No specific status values were shown in this video — see Open Questions.

## Business rules

- The patient file number is central to patient search and patient workflows (used as a distinct search field on the patients list, separate from name/phone search).
- The file number is shown on the registration form and appears to be generated automatically on save (observed: present on the form before any manual entry was shown for it).
- Patient registration supports branch context (a الفرع/Branch field exists on the registration form and as a filter on the patients list).
- Patient registration supports demographic, identity, contact, marketing, companion, and insurance information, all on the same registration screen.
- The patients list supports searching by name/phone and separately by file number.
- Existing patient rows lead to edit, patient file, and visit registration actions.
- Patient data can be printed as a patient card/info sheet, with a defined field set distinct from (a subset of) the registration form's fields.

## Entities

**Patient** — directly implied by the registration form and print preview fields above.

**PatientInsurance** (or equivalent) — directly implied by the health insurance section fields above.

**Potential data entity shape** (draft sketch derived from the observed fields above, not a confirmed schema and not an Elaji commitment):

```
Patient
  id
  fileNumber
  branchId
  registrationDate
  firstName
  secondName
  lastName
  fullName
  birthDate
  ageYears
  ageMonths
  ageDays
  gender
  phone
  email
  address
  nationality
  city
  identityType
  identityNumber
  bloodType
  maritalStatus
  marketingChannel
  motherName
  specialty / profession
  companion
  notes
  photo
  status
  createdByUserId
  createdAt
  updatedAt

PatientInsurance
  id
  patientId
  insuranceCompanyId
  insurancePlanId
  startDate
  validUntil
  insuranceNumber
  relationship / coveragePerson
```

## Relations

- Patient → PatientInsurance (a patient can have an associated insurance record — only one was shown in this video; whether multiple are supported is not confirmed).
- Patient → Branch (a patient is registered under a branch).
- Patient → User (المدخل/"Entered by" column on the patients list implies the registering user is recorded).
- This builds on the Patient entity already noted in videos 01 and 04 — this video shows the registration form that produces it, with substantially more field detail than was visible in those earlier screens.

## Permissions implied

None directly observed. No role/permission distinction was shown for who can register, edit, or print a patient — see Open Questions.

## Reports / outputs

- Patient card / info print preview (بطاقة مريض) — a printable summary of a subset of the patient's registration fields.

## Elaji relevance

- Elaji's patient registration should support the core patient demographics and search fields observed here.
- Elaji should keep `fileNumber` as a user-visible identifier, separate from the internal primary key/UUID.
- Elaji should support branch/clinic context if multi-branch is part of the model.
- Elaji should avoid relying on `fileNumber` as a primary key.
- Elaji should consider duplicate-patient warnings using name/phone/identity/birth-date matching.
- Elaji can keep insurance fields nullable or deferred to a later roadmap phase, but the data model should not block future insurance support.
- Elaji should include a patient print/info output eventually, but it is not required before the core clinical workflow is stable.
- Elaji should treat marketing channel as optional, useful for later reporting.
- Patient registration and patient data changes should be audit logged.
- Patient records must be tenant-scoped.

*(Note: this section records observations for later roadmap discussion. None of the above is a committed Elaji decision — that determination belongs in `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`, not here.)*

## Risks and Edge Cases

These are risk considerations raised by this video's content, not confirmed MedPro behavior:

- Duplicate patients due to missing phone/identity data.
- Same-name patients, especially children, being confused with each other.
- File number collision in multi-branch or future offline/local deployments.
- Changing branch after patient creation.
- Insurance data becoming stale or expired without any visible review prompt.
- Exposing insurance/identity/contact fields to unauthorized roles.
- Printing patient data without permission or audit logging.
- Photo upload privacy and storage concerns.
- Tenant isolation across patient searches.

## Inferred / Not Yet Confirmed

These were not directly shown in the video and must not be treated as confirmed MedPro behavior:

- Whether searching for an existing patient before creating a new one is required or enforced.
- The exact patient file number generation algorithm.
- Whether the file number is a branch-prefix + sequence, or some other scheme.
- Whether full name is auto-generated (e.g. concatenated from first/second/last) and read-only.
- Whether the phone number field is required or optional.
- Whether birth date and the three age fields (years/months/days) are two-way synchronized.
- Whether the patient card includes a barcode or QR code.
- Whether marketing channel data feeds into any report.
- Which fields, if any, are mandatory beyond what a visible asterisk might indicate (no asterisks were specifically called out in the provided observations).
- The exact meaning of the small action icons in the patient list rows beyond Edit/Patient file/Register visit.
- The exact patient active/inactive status names.
- What permissions govern creating, editing, or printing patients.

## Open questions

- Which fields are truly required?
- Is phone required?
- Is the identity document required?
- Is full name generated automatically from the other name fields?
- How exactly is the file number generated?
- Is the file number unique per branch, or globally across the system?
- Can the file number be edited manually?
- Does the patient card include a barcode or QR code?
- What do the small icons in the patient row operations mean?
- Can a patient be disabled/inactivated?
- Can insurance be attached later, after the patient is already created?
- Can multiple insurance policies be attached to one patient?
- Are marketing channels configured in a system-level settings list?
- Does the system prevent or warn about duplicate patients?
- Are patient photos stored locally or in dedicated file storage?
