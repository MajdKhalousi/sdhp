# Video: 12 - تعريف أنواع الخدمات الطبية (MedPro)

- **Video link:** https://www.youtube.com/watch?v=7XFodvdc4CM
- **Duration:** 03:12
- **Module:** Settings / Medical Service Types Configuration
- **Priority:** High
- **Status:** Draft with screenshots reviewed
- **Date analyzed:** 2026-06-28

> Per `../README.md`: this note documents only what was explicitly shown in this video's screenshots. Anything not directly observed is listed separately under **Inferred / Not Yet Confirmed**, not mixed into the confirmed sections below. Nothing here is an Elaji commitment.

## Screens / pages shown

- Medical Service Types screen (أنواع الخدمات الطبية), located under system setup.

## Actions

- نوع خدمة طبية جديدة (New medical service type) — button.
- Save — button, at the bottom of the screen.
- Search/filter: by service name, by service code, by category, plus a filter button.
- Delete — action/icon on a row.
- Inline row entry/editing appears to be supported by the data grid.

## Fields

**Data grid columns (exact, as shown):**
- كود الخدمة (Service code)
- اسم الخدمة (Service name)
- الاسم بالإنجليزي (English name)
- الفئة (Category)
- رمز التأمين (Insurance code)
- السعر (Price)
- سعر متغير؟ (Variable price?)
- متعددة الجلسات؟ (Multi-session?)
- عدد الجلسات (Session count)
- الحالة (Status)

**Other fields observed:**
- Two checkboxes: variable price, multi-session.
- A session count field.
- Price can be entered as 0 (observed in the visible row).

## Statuses

- الحالة (Status) column exists with a status indicator, consistent with the pattern observed for Visit Types in video 02. The exact status values were not confirmed in this video — see Open Questions.

## Business rules

- A medical service has a code.
- A medical service has Arabic and English labels/descriptions.
- A medical service can belong to a category.
- A medical service can have an insurance code.
- A medical service has a price, and that price can be 0.
- A medical service can be marked as variable-price.
- A medical service can be marked as multi-session, with an associated session count.
- A medical service has a status indicator.
- Medical services should be configured before they are requested/executed for patients (consistent with the visit-type prerequisite pattern observed in videos 01 and 02).

## Entities

**MedicalService** — directly implied by this screen's columns:
- Service code
- Name (Arabic)
- Name (English)
- Category
- Insurance code
- Price
- Variable-price flag
- Multi-session flag
- Session count
- Status

**Potential data entity shape** (draft sketch derived from the observed columns above, not a confirmed schema and not an Elaji commitment):

```
MedicalService
  id
  code
  nameAr / descriptionAr
  nameEn / descriptionEn
  category
  insuranceCode
  price
  hasVariablePrice
  isMultiSession
  sessionCount
  status / isActive
  createdAt
  updatedAt
```

## Relations

- Medical services are distinct from visit types — confirmed directly in this video (no shared screen, no shared fields beyond the general code/name/price/insurance-code/status pattern already seen for VisitType in video 02).
- This configuration is related to later workflows for requesting medical services for patients and to payment requests (both referenced in video 01's edit-appointment modal as "Request medical service," and in the Payment Requests page's "Service" column) — the exact link between a requested service and a payment request is not confirmed by this video; see Open Questions.

## Permissions implied

None directly observed. No role/permission distinction was shown for who can view or edit medical service types — see Open Questions.

## Reports / outputs

None observed in this video.

## Elaji relevance

- Elaji should keep VisitType and MedicalService as separate concepts, consistent with this video's confirmation that they are distinct in MedPro.
- Elaji should build a Service Catalog that supports: code, bilingual label, category, price, variable-price flag, multi-session flag, session count, and active/inactive state.
- Elaji should not hard-delete services that were used historically.
- Elaji should snapshot service price and label into billing/payment request records at the time a service is requested for a patient, so historical records are unaffected by later catalog edits.
- Variable-price services likely require explicit pricing at request time, not just at catalog-definition time.
- Multi-session services likely require later tracking of performed sessions vs. remaining sessions.
- Insurance code can remain nullable, or be deferred to a later roadmap phase, if insurance is not in Elaji's MVP scope.
- The service catalog must be tenant-scoped, and possibly clinic-scoped, depending on Elaji's final model.

*(Note: this section records observations for later roadmap discussion. None of the above is a committed Elaji decision — that determination belongs in `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`, not here.)*

## Risks and Edge Cases

These are risk considerations raised by this video's content, not confirmed MedPro behavior:

- Duplicate service codes.
- Changing a service price after historical billing records exist.
- Deleting/disabling a service used by old visits or payment requests.
- A variable-price service requested without a final price being set.
- A multi-session service requested without a valid session count.
- Zero-price services and how billing should treat them.
- Category values becoming inconsistent if the field is free-text rather than a fixed list.
- Tenant isolation leakage across service catalogs.

## Inferred / Not Yet Confirmed

These were not directly shown in the video and must not be treated as confirmed MedPro behavior:

- Whether service codes are manually organized by numeric ranges.
- Whether requesting a medical service automatically creates a payment request.
- Whether service prices feed billing and reports automatically.
- Whether the service code is enforced as unique.
- Whether category is selected from a predefined list or entered as free text.
- Whether "status" means active/inactive specifically — exact status names not confirmed.
- What permissions govern viewing/editing services — not visible in this video.
- Whether medical service requests are created from appointments, visits, encounters, or some combination — needs confirmation from a service-request-specific video.

## Open questions

- Is service code required and unique?
- Is category predefined or free-text?
- What are the exact status values?
- Can inactive services still appear in historical records?
- Can services be scoped to a specific clinic or specialty?
- Can different doctors have different prices for the same service?
- How does variable price behave during a patient service request?
- How are multi-session services executed and tracked over time?
- Does requesting a service automatically create a payment request?
- Can one patient request include multiple services?
- Does a service request happen from an appointment, a visit, an encounter, or all of them?
- Is insurance code required or optional?
- Does the payment action print a receipt?
