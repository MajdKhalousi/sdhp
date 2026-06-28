# Video: MedPro Clinic Management System - Reservation & Patient Flow Module

- **Video link:** https://www.youtube.com/watch?v=cqG7_YTnnzA
- **Module:** Appointments, Visits, Queue, and Payment Requests
- **Priority:** High
- **Status:** Draft with screenshots reviewed
- **Date analyzed:** 2026-06-28

> Per `../README.md`: this note documents only what was explicitly shown in this video's screenshots. Anything not directly observed is listed separately under **Inferred / Not Yet Confirmed**, not mixed into the confirmed sections below. Nothing here is an Elaji commitment.

## Screens / pages shown

- Appointment schedule (weekly calendar view)
- New appointment modal
- Patient search modal (opened from the new appointment modal)
- Edit appointment modal
- Visits page (with a "no visit types configured" warning state, and a new-visit section + visits table)
- Send-to-clinic confirmation warning (unpaid visit)
- Waiting queue screen (standalone)
- Payment requests page (under accounting)
- Payment modal (opened from a payment request)

## Actions

- Appointment schedule: navigate previous / today / next; select clinic; toggle "group by clinics"
- New appointment modal: search/select patient; Add; Add and send WhatsApp confirmation; Close
- Patient search modal: search; select a patient from results
- Edit appointment modal: Update; Send WhatsApp reminder; Register visit; Request medical service; Request lab test; Delete; Close
- Visits page: Register new visit
- Visits table row actions: Patient file; Send to clinic; Cancel
- Send to clinic: confirm or cancel the unpaid-visit warning
- Payment requests page: Make payment (per row)
- Payment modal: submit a payment (exact submit action label not captured)

## Fields

**New appointment modal:** From time, To time, Patient file number, Patient name, Mobile number, Notes.

**Patient search modal results table:** Patient name, file number, age, mobile number, identity document number.

**Edit appointment modal:** Appointment date, From time, To time, Status (shown as "scheduled"), Patient file number, Patient name, Mobile number, Notes.

**New visit section (Visits page):** File number, Patient name, Visit type, Medical condition/category, Clinic.

**Visits table columns:** File number, Patient name, Date, Time, Waiting time, Visit type, Medical condition/category, Clinic, Payment status, Visit status, Previous appointment (yes/no), Actions.

**Waiting queue screen:** Clinic/doctor name, Total count, Patient name, Waiting time, Previous appointment (yes/no), Status, Queue number/token.

**Payment requests page filters:** Request date, Payment status, Patient file number.

**Payment requests table columns:** Patient name, File number, Request date, Requested by, Service, Details, Amount, Paid amount, Remaining amount, Status, Action.

**Payment modal fields:** Debit/credit indicator, Patient file number, Patient name, Service, Payment method, Currency, Payment type, Paid amount, Tax percentage, Discount type, Discount value, Discount reason, Notes.

**Payment modal financial summary:** Required payment, Paid amount, Discount amount, Insurance share, Total tax, Net payment.

## Statuses

- **Appointment schedule legend:** scheduled, registered/recorded.
- **Edit appointment modal status field:** observed value "scheduled" (only value seen).
- **Visit — payment status:** observed value "unpaid" (only value seen).
- **Visit — visit status:** observed value "waiting" (only value seen).
- **Visit — previous appointment flag:** yes / no.
- **Queue status:** "Next", "In treatment / processing." Observed transition: after confirming "send to clinic" on an unpaid visit, the queue/display status changes from Next/waiting to In treatment / processing.
- **Payment request status:** observed value "unpaid" (only value seen).

No other status values were shown in this video — the full set of possible values for any of these fields is an open question (see below).

## Business rules

- Visit types must be configured before a visit can be added (a blocking warning is shown on the Visits page otherwise).
- A visit can exist with an unpaid payment status — payment is not required to create a visit.
- Sending an unpaid visit to the clinic requires confirming a warning ("The visit is unpaid. Do you want to continue anyway?") — it is not silently blocked, but it is not silent either.
- Payment requests are tracked on a separate page/table from the visit list, not embedded in it.
- A payment request tracks amount, paid amount, remaining amount, and status as distinct fields.
- From the appointment edit modal, a user can initiate: visit registration, medical service request, lab request, WhatsApp reminder, and appointment deletion — i.e. the edit modal is a hub for several distinct downstream actions, not just an edit form.

## Entities

Observed or directly implied by the screens above: **Appointment**, **Patient**, **Clinic** (and/or Doctor — the queue screen labels this "Clinic/doctor name," so it's unclear if these are the same field or two related concepts), **Visit**, **Visit Type**, **Medical Condition/Category**, **Queue Entry**, **Payment Request**, **Payment**, **Service**, **Lab Test**.

## Relations

- Appointment → Patient (an appointment is for one patient; patient is searched/selected when creating an appointment).
- Appointment → Clinic (appointments are scheduled per clinic; the schedule view has a clinic selector and a "group by clinics" option).
- Visit → Appointment (the visits table has a "previous appointment" flag, implying a visit can be linked back to an appointment that preceded it).
- Visit → Visit Type, Visit → Medical Condition/Category, Visit → Clinic (all set at visit registration).
- Visit → Queue Entry (sending a visit "to clinic" appears to be what produces/advances its queue presence — the queue status changes at that point).
- Payment Request → Service (the payment requests table has a "Service" column) and, by inference, → Visit (not directly confirmed — see open questions).
- Payment → Payment Request (a payment is made against a payment request, via the payment modal opened from a request row).

## Permissions implied

No role or permission distinctions were directly shown in this video — no login-as-different-role comparison, no visibly disabled/hidden action tied to a role. The unpaid send-to-clinic confirmation warning *suggests* there could be a permission or audit control around overriding non-payment, but this is not confirmed — see **Inferred / Not Yet Confirmed** below.

## Reports / outputs

- The Payment requests page itself functions as a report-like listing (filterable by request date, payment status, patient file number), but no distinct "report" or export/print action was shown.
- No PDF/print/export action was observed anywhere in this video.

## Elaji relevance

- Elaji should model appointments, visits, queue entries, and payment requests as related but separate workflow objects, not collapse them into one record.
- Elaji should support unpaid visits with an explicit, permission/audit-controlled override, rather than either hard-blocking on payment or allowing silent unpaid progression.
- Elaji should avoid forcing payment before the visit unless clinic policy explicitly requires it — i.e. payment-before-visit should be a configurable policy, not a hardcoded requirement.
- Elaji should include visit type configuration as a prerequisite before visit registration, with a clear blocking message when missing (matching MedPro's observed pattern).
- Elaji should have a clear payment request concept (or equivalent financial ledger entry) for services and visits, distinct from the visit record itself.
- Elaji's queue should support: token/queue number, waiting status, in-treatment status, a previous-appointment flag, and clinic/doctor context.
- Elaji's appointment edit screen could become an operational hub — reminder, visit registration, service request, lab request, cancellation — rather than a plain edit form, mirroring MedPro's edit-modal pattern.

*(Note: this section records observations for later roadmap discussion. None of the above is a committed Elaji decision — that determination belongs in `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md`, not here.)*

## Inferred / Not Yet Confirmed

These were not directly shown in the video and must not be treated as confirmed MedPro behavior:

- Whether double-booking prevention exists.
- Whether invoices are automatically generated at check-in.
- The exact, complete appointment state machine (only "scheduled" and "registered/recorded" were seen in the legend).
- The exact, complete invoice/payment state machine (only "unpaid" was seen).
- Whether the doctor dashboard / queue screen updates in real time or requires manual refresh.
- Whether the WhatsApp integration is native (in-app messaging) or link-based (opens WhatsApp with a pre-filled message).
- Whether "payment before visit" is configurable per clinic, per service, or per user role.

## Open questions

- What are all appointment statuses (beyond "scheduled" and "registered/recorded")?
- What are all visit statuses (beyond "waiting")?
- What are all payment statuses (beyond "unpaid")?
- Can the user create a new patient directly from the appointment form, or only search/select an existing patient by name?
- Does MedPro generate a payment request automatically when registering a visit?
- Does requesting a medical service or lab test always create a payment request?
- Is the unpaid send-to-clinic override controlled by a permission?
- What audit trail, if any, exists for the unpaid override?
- What happens to a visit's payment request when the visit is cancelled after payment?
- What happens if the appointment is deleted after a visit or payment request already exists for it?
- Does the queue number reset daily, and is that reset per clinic or global?
- Can the same patient have multiple visits on the same day?
- Can one visit include multiple services and lab requests?
- How are insurance shares calculated (the payment modal has an "Insurance share" field, but the calculation logic was not shown)?
- Does the payment action print or generate a receipt?
- Does the queue screen auto-refresh, or does it require a manual reload?
