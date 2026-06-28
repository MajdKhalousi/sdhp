# Video: 11 - تعريف أنواع الزيارات (MedPro)

- **Video link:** https://www.youtube.com/watch?v=G-y7gMj172g
- **Duration:** 01:47
- **Module:** Settings / Visit Types Configuration
- **Priority:** High
- **Status:** Draft with screenshots reviewed
- **Date analyzed:** 2026-06-28

> Per `../README.md`: this note documents only what was explicitly shown in this video's screenshots. Anything not directly observed is listed separately under **Inferred / Not Yet Confirmed**, not mixed into the confirmed sections below. Nothing here is an Elaji commitment.

## Screens / pages shown

- Visit Types screen (أنواع الزيارات), located under system setup.

## Actions

- نوع زيارة جديدة (New visit type) — button.
- حفظ (Save) — button, at the bottom of the screen.

## Fields

**Data grid/table columns:**
- الوصف بالعربي (Description in Arabic)
- الوصف بالإنجليزي (Description in English)
- رمز التأمين (Insurance code)
- السعر (Price)
- الحالة (Status)

**Example rows observed:**
| الوصف بالعربي | الوصف بالإنجليزي | السعر | الحالة |
|---|---|---|---|
| معاينة | mm | 2100 | active (green status icon) |
| زيارة | m | 0 | active (green status icon) |

## Statuses

- الحالة (Status) is represented visually by a green icon on the rows observed. Both example rows show this same green/active-looking icon — no inactive/disabled example was shown, so the full set of status values and their exact meaning is not confirmed (see Open Questions).

## Business rules

- Visit types must be configured before visits can be registered (this is the same rule observed as a blocking warning on the Visits page in video 01 — this video shows the configuration screen that satisfies that prerequisite).
- Visit types can have a price.
- Visit type price may be zero (confirmed by the "زيارة" row showing price 0).
- Visit type has an insurance code column, implying it supports an associated insurance code.
- Visit type has an active/enabled status indicator.

## Entities

**VisitType** — directly implied by this screen's columns:
- Arabic description (note: this is a name/description field, not necessarily a structured "name" vs. "description" distinction)
- English description
- Insurance code
- Price
- Status

This is consistent with, and adds detail to, the **Visit Type** entity already noted in `01-reservation-patient-flow.md`'s Entities/Relations sections (Visit → Visit Type).

**Potential data entity shape** (draft sketch derived from the observed columns above, not a confirmed schema and not an Elaji commitment):

```
VisitType
  id
  nameAr
  nameEn
  insuranceCode
  price
  status / isActive
  createdAt
  updatedAt
```

## Relations

- Visit Type ← Visit (a visit references a visit type — confirmed in video 01; this video shows where that visit type is defined/configured, not the relation itself).

## Permissions implied

None directly observed. No role/permission distinction was shown for who can view or edit visit types — see Open Questions.

## Reports / outputs

None observed in this video.

## Elaji relevance

- Elaji should include VisitType configuration as a prerequisite before allowing structured visit registration (consistent with the video 01 finding).
- VisitType should support a zero price.
- VisitType should snapshot its price into financial records when a visit/payment request is created, so historical payments are not affected by later price changes to the visit type.
- VisitType should likely support active/inactive rather than hard deletion, given the visible status indicator and no delete action shown in this video.
- An insurance code field could be added later, or included as nullable now, if future insurance compatibility is a goal.
- VisitType should be tenant-scoped, and possibly clinic-scoped, depending on Elaji's final model — this video does not show enough to confirm which.

*(Note: this section records observations for later roadmap discussion. None of the above is a committed Elaji decision — that determination belongs in `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`, not here.)*

## Risks and Edge Cases

These are risk considerations raised by this video's content, not confirmed MedPro behavior:

- Changing a visit type's price after historical visits/payments already exist against it.
- Deleting or disabling a visit type that is still used by scheduled appointments or past visits.
- Using a zero-price visit type without clear, defined payment behavior.
- An insurance code field may add unnecessary complexity if implemented too early in an MVP.
- Visit types must not leak across tenants.

## Inferred / Not Yet Confirmed

These were not directly shown in the video and must not be treated as confirmed MedPro behavior:

- Whether selecting a visit type automatically creates a payment request.
- Whether visit type price feeds into revenue reports.
- Whether visit type names are required in both Arabic and English.
- Whether visit types are global at the center level.
- Whether visit types can be customized per clinic/doctor.
- Whether editing is inline in the grid — the exact edit interaction was not confirmed.
- Whether "status" means active/inactive specifically — the exact state names were not confirmed, only a green icon was observed.
- What permissions govern viewing/editing visit types — not visible in this video.

## Open questions

- Are visit types global for the whole center, or defined per clinic?
- Can different doctors have different prices for the same visit type?
- What are the exact allowed status values?
- Is the insurance code required or optional?
- Does saving happen row-by-row, or via the single global Save button only?
- Can a visit type be deleted, or only disabled?
- Does choosing a visit type automatically create a payment request?
- Is the visit type used in appointment booking, visit registration, or both?
- Are there validation rules for duplicate Arabic/English names?
