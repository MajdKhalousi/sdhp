# Video: Clinic settings - patient file field configuration

- **Video link:** https://www.youtube.com/watch?v=ROvZ1R4p7yY
- **Module:** Settings / Clinic Patient File Configuration
- **Priority:** High
- **Status:** Draft with screenshots reviewed
- **Date analyzed:** 2026-06-28

> Per `../README.md`: this note documents only what was explicitly shown in this video's screenshots. Anything not directly observed is listed separately under **Inferred / Not Yet Confirmed**, not mixed into the confirmed sections below. Nothing here is an Elaji commitment.
>
> Note: an earlier analysis of this video (from a different source) was discarded because it appeared to describe a different workflow. This note is built only from the screenshot-confirmed observations supplied for this video.

## Screens / pages shown

- Settings screen (الإعدادات), under system setup, with a clinic selector and top-level settings tabs.
- Within clinic settings: a set of patient-file-related sub-tabs, including a medical history tab, a treatment plan tab, and others listed below.

## Actions

- Select a clinic (clinic selector).
- Switch between top-level settings tabs.
- Switch between clinic-settings sub-tabs.
- Enable/disable individual fields (medical history tab, social history section, treatment plan tab).
- Select default voice recognition language.
- Save.

## Fields

**Top-level settings tabs (exact, as shown):**
- إعدادات العيادات (Clinic settings)
- إعدادات الفروع (Branch settings)
- حقول بطاقة المريض المخصصة (Custom patient card fields)
- نسب الأطباء (Doctor percentages/shares)
- إعدادات الضريبة (Tax settings)

**Clinic-settings sub-tabs related to the patient file (exact, as shown):**
- التاريخ المرضي (Medical history)
- خطة العلاج (Treatment plan)
- ملف مريض (Patient file)
- الوصفات الطبية (Prescriptions)
- التقارير الطبية (Medical reports)
- إعدادات الأسنان (Dental settings)
- أوقات العمل (Working hours)

**Voice recognition settings:** default voice language (shown set to Arabic).

**Medical history tab — toggleable fields:** show height, show weight, show main complaint, show surgeries, show medications, show hospitalizations, show allergies, show current medical conditions, show past medical conditions, show injuries/accidents, show blood transfusions, show organ transplants, show medical history notes.

**Social history section — toggleable fields:** smoking status, alcohol use status, drug use status, sports practices, dietary activity history, fertility, pregnancy cases, miscarriage cases, sexually transmitted disease history, sexual activity status, menstrual cycle status, social history notes.

**Treatment plan tab — toggleable fields:** symptoms and complaints, evaluation, plan, treatments, treatment progress status, recommendations, general notes.

## Statuses

None observed — this video shows on/off field toggles, not a record-level status field.

## Business rules

- Patient file sections can be customized per selected clinic (the clinic selector governs which clinic's settings are being edited).
- Medical history fields can be enabled or disabled individually.
- Treatment plan fields can be enabled or disabled individually.
- The system supports specialty/clinic-specific patient file configuration — i.e. the same patient file form can show a different set of fields depending on clinic settings.
- Voice recognition language appears configurable, with Arabic shown as the observed default.

## Entities

**ClinicPatientFileSettings** — directly implied by the toggle-based configuration screens above.

**Potential data entity shape** (draft sketch derived from the observed fields above, not a confirmed schema and not an Elaji commitment):

```
ClinicPatientFileSettings
  id
  clinicId
  section
  fieldKey
  isEnabled
  createdAt
  updatedAt
```

**Potential grouped setting areas** (not separately confirmed as distinct entities — listed here as a possible decomposition of the above):
- MedicalHistoryFieldSettings
- SocialHistoryFieldSettings
- TreatmentPlanFieldSettings
- VoiceRecognitionSettings

## Relations

- ClinicPatientFileSettings → Clinic (settings are scoped to a selected clinic).
- This relates to, but is distinct from, the patient file tabs already observed in video 04 (التاريخ المرضي, خطة العلاج, etc. appear there as patient-facing tabs; this video shows the *configuration* screen that governs which fields appear within them — the two were not shown together in the same screenshot, so the exact link between this settings screen and the video 04 patient-file tabs is inferred, not confirmed).

## Permissions implied

None directly observed. No role/permission distinction was shown for who can access or change these clinic settings — see Open Questions.

## Reports / outputs

None observed in this video.

## Elaji relevance

- Elaji should not hardcode all clinical fields permanently into every clinic workflow.
- Elaji can start with a fixed patient profile and encounter structure, then later support clinic-specific field visibility as a configurability layer.
- For MVP, Elaji should document this as a future capability unless the current architecture already supports it.
- Clinical field visibility should be tenant/clinic-scoped.
- Changing field visibility should not delete historical data already recorded under a now-hidden field.
- Field configuration changes should be audit logged.
- Voice recognition (dictation) can be deferred to a later roadmap phase.

*(Note: this section records observations for later roadmap discussion. None of the above is a committed Elaji decision — that determination belongs in `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`, not here.)*

## Risks and Edge Cases

These are risk considerations raised by this video's content, not confirmed MedPro behavior:

- Hiding fields that already contain historical data.
- Role-based visibility conflicting with clinic-level field visibility.
- Specialty-specific forms becoming too complex if built too early.
- Field configuration leaking across tenants or clinics.
- Disabling a critical clinical field by accident.
- Audit requirements for changing clinical documentation settings.

## Inferred / Not Yet Confirmed

These were not directly shown in the video and must not be treated as confirmed MedPro behavior:

- Whether field configuration is per clinic only, or also per doctor/specialty.
- Whether disabled fields are hidden from all users, or only from specific roles.
- Whether disabling a field affects historical records, or only new entries going forward.
- Whether custom fields can be added dynamically, beyond toggling the predefined fields shown.
- Whether voice recognition is actually used for dictation inside the clinical fields it's configured for.
- Whether these settings are tenant-wide or clinic-specific (a clinic selector was shown, suggesting clinic-specific, but tenant-wide defaults/overrides were not confirmed either way).

## Open questions

- Is this configuration per clinic, per branch, per doctor, or tenant-wide?
- Can users add custom fields, or only toggle the predefined fields shown?
- Are disabled fields hidden from old records, or only from new forms?
- Can field visibility differ by role?
- Does changing these settings require a specific admin permission?
- Is there audit logging for configuration changes?
- How is voice recognition actually used inside the clinical workflow?
