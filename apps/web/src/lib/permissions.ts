// ─── Sidebar nav visibility ───────────────────────────────────────────────────
// Exported as readonly string[] — sidebar uses .includes(role) to filter items.

// SUPER_ADMIN is intentionally excluded from every clinic-operational nav
// role list below (134A) — SUPER_ADMIN is a platform operator, not a clinic
// operator, and only sees Platform/Overview, Organizations, and My Profile
// in the sidebar. This does not affect page-level access guards elsewhere
// in this file, which still allow SUPER_ADMIN — direct clinic URL access
// is unchanged and deferred to a future phase.
export const NAV_DASHBOARD_ROLES: readonly string[]           = ['ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY', 'ACCOUNTANT', 'TECHNICIAN'];
export const NAV_TODAY_ROLES: readonly string[]               = ['ORG_ADMIN', 'SECRETARY', 'DOCTOR', 'NURSE', 'ACCOUNTANT'];
export const NAV_PATIENTS_ROLES: readonly string[]            = ['ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY', 'ACCOUNTANT'];
export const NAV_APPOINTMENTS_ROLES: readonly string[]        = ['ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY'];
export const NAV_QUEUE_ROLES: readonly string[]               = ['ORG_ADMIN', 'NURSE', 'SECRETARY'];
export const NAV_DOCTOR_WORKSPACE_ROLES: readonly string[]    = ['ORG_ADMIN', 'DOCTOR'];
export const NAV_DOCTOR_QUEUE_ROLES: readonly string[]        = ['ORG_ADMIN', 'DOCTOR'];
export const NAV_MY_FOLLOW_UPS_ROLES: readonly string[]       = ['DOCTOR'];
export const NAV_TECHNICIAN_LABS_ROLES: readonly string[]     = ['ORG_ADMIN', 'TECHNICIAN'];
export const NAV_TECHNICIAN_RADIOLOGY_ROLES: readonly string[]= ['ORG_ADMIN', 'TECHNICIAN'];
export const NAV_MEDICAL_SERVICES_QUEUE_ROLES: readonly string[] = ['ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN', 'SECRETARY'];
export const NAV_FOLLOW_UPS_ROLES: readonly string[]          = ['ORG_ADMIN', 'BRANCH_ADMIN', 'NURSE', 'SECRETARY'];
export const NAV_CASHIER_ROLES: readonly string[]             = ['ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY'];
export const NAV_INVOICES_ROLES: readonly string[]            = ['ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY'];
export const NAV_BILLING_REPORTS_ROLES: readonly string[]     = ['ORG_ADMIN', 'ACCOUNTANT'];
export const NAV_DOCTORS_ROLES: readonly string[]             = ['ORG_ADMIN'];
export const NAV_PLATFORM_ROLES: readonly string[]            = ['SUPER_ADMIN'];
export const NAV_PLATFORM_ORGANIZATIONS_ROLES: readonly string[] = ['SUPER_ADMIN'];
export const NAV_PLATFORM_PAYMENTS_ROLES: readonly string[]   = ['SUPER_ADMIN'];
export const NAV_PLATFORM_AUDIT_LOGS_ROLES: readonly string[] = ['SUPER_ADMIN'];
export const NAV_PLATFORM_USERS_ROLES: readonly string[]      = ['SUPER_ADMIN'];
export const NAV_SETTINGS_ROLES: readonly string[]            = ['ORG_ADMIN'];
export const NAV_HR_ROLES: readonly string[]                  = ['ORG_ADMIN'];
export const NAV_PROFILE_ROLES: readonly string[]             = ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY', 'ACCOUNTANT', 'TECHNICIAN'];

// ─── Super admin platform-only route hardening (134B) ────────────────────────
// SUPER_ADMIN is a platform operator, not a clinic operator. PlatformOnlyGuard
// (components/layout/platform-only-guard.tsx) redirects SUPER_ADMIN away from
// any /dashboard/* route that isn't covered by this allow-list. Default-deny:
// any new clinic route added in the future is blocked automatically without
// needing to update this list. Paths are locale-stripped, matching what
// usePathname() from '@/i18n/navigation' already returns everywhere else in
// this codebase (see sidebar.tsx, settings/layout.tsx for the same pattern).
// Note: the bare '/dashboard' route is handled separately in the guard itself
// (exact match, not a prefix) — it already redirects via its own page-level
// effect from Phase 134A, which this guard's redirect harmlessly overlaps with.

export const SUPER_ADMIN_ALLOWED_PATH_PREFIXES: readonly string[] = [
  '/dashboard/platform',
  '/dashboard/profile',
];

// ─── Settings & admin page guards ────────────────────────────────────────────

export const PLATFORM_ACCESS_ROLES  = new Set(['SUPER_ADMIN']);
export const SETTINGS_ACCESS_ROLES  = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);
export const DOCTORS_PAGE_ROLES     = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);
// Employee profile (HR) pages — used by both /dashboard/settings/employees
// (inherits SettingsLayout's SETTINGS_ACCESS_ROLES guard directly) and the
// new /dashboard/hr/* module (145B), which uses this constant directly via
// RoleGuard. SUPER_ADMIN is listed but, per PlatformOnlyGuard (134B), cannot
// reach any /dashboard/settings/* or /dashboard/hr/* route in practice —
// pre-existing behavior, unchanged by this phase. ACCOUNTANT deliberately
// excluded even though the backend allows read access — frontend HR access
// is ORG_ADMIN-only for this MVP (see Phase 144D).
export const EMPLOYEES_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);

// ─── Doctor workspace page access ────────────────────────────────────────────
// Mirrors NAV_DOCTOR_WORKSPACE_ROLES and NAV_DOCTOR_QUEUE_ROLES.

export const DOCTOR_WORKSPACE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR']);

// ─── My Follow-ups page access ────────────────────────────────────────────────
// Mirrors NAV_MY_FOLLOW_UPS_ROLES.

export const MY_FOLLOW_UPS_ROLES    = new Set(['DOCTOR']);

// ─── Follow-ups page access ───────────────────────────────────────────────────
// DOCTOR is separately redirected to /my-follow-ups; all others not in this set
// receive the forbidden message.

export const FOLLOW_UP_PAGE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_ADMIN', 'NURSE', 'SECRETARY']);

// ─── Dashboard overview card visibility ──────────────────────────────────────

export const DASHBOARD_BILLING_ROLES      = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);
export const DASHBOARD_OPS_ROLES          = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'DOCTOR', 'NURSE']);
export const DASHBOARD_LAB_ROLES          = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN']);
export const DASHBOARD_WORKLOAD_ROLES     = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'TECHNICIAN']);
export const DASHBOARD_COMPLETED_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
export const DASHBOARD_FOLLOWUP_ROLES     = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'DOCTOR', 'NURSE']);
export const DASHBOARD_NEW_PATIENT_ROLES  = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

// ─── Today Hub action gates ───────────────────────────────────────────────────
// TODAY_BILLING_ROLES must match backend TODAY_HUB_BILLING_ROLES — ORG_ADMIN
// and ACCOUNTANT only (SUPER_ADMIN is excluded by the backend /today endpoint).
//
// TODAY_ENCOUNTER_ROLES: API allows ORG_ADMIN + DOCTOR to read encounters;
// NURSE/SECRETARY can read but the encounter workspace is not their surface.
//
// TODAY_ADVANCE_ROLES: backend PATCH /v1/queue/:id allows SUPER_ADMIN, ORG_ADMIN,
// DOCTOR, NURSE — SECRETARY is excluded. DOCTOR uses Doctor Queue page instead.

export const TODAY_BILLING_ROLES         = new Set(['ORG_ADMIN', 'ACCOUNTANT']);
export const TODAY_ENCOUNTER_ROLES       = new Set(['ORG_ADMIN', 'DOCTOR']);
export const TODAY_DOCTOR_FILTER_ROLES   = new Set(['ORG_ADMIN', 'SECRETARY']);
export const TODAY_CHECK_IN_ROLES        = new Set(['ORG_ADMIN', 'SECRETARY']);
export const TODAY_ADVANCE_ROLES         = new Set(['ORG_ADMIN', 'NURSE']);

// ─── Patients page action gates ───────────────────────────────────────────────

export const PATIENT_EDIT_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
export const PATIENT_ARCHIVE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);
export const PATIENT_BOOK_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
export const PATIENT_INVOICE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);

// ─── Pending patient-link review page (150B-3A) ──────────────────────────────
// Mirrors backend GET /patients/pending-links (patients.controller.ts) exactly
// — no SUPER_ADMIN, no ACCOUNTANT, no NURSE.
export const PENDING_LINKS_ACCESS_ROLES = new Set(['ORG_ADMIN', 'DOCTOR', 'SECRETARY']);

// ─── Appointments page action gates ──────────────────────────────────────────

export const APPOINTMENT_CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
export const APPOINTMENT_MUTATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

// ─── Invoice creation gates ───────────────────────────────────────────────────

export const INVOICE_CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);

// ─── Patient detail page ──────────────────────────────────────────────────────

export const CLINICAL_ROLES            = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE']);
export const PATIENT_SAFETY_ALERT_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY']);
export const RECEPTION_ACTION_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

// ─── Encounter detail page access (150B-3A) ──────────────────────────────────
// Mirrors backend GET /encounters/:id (encounters.controller.ts) exactly —
// ACCOUNTANT has no clinical encounter access at any level.
export const ENCOUNTER_DETAIL_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY']);

// ─── Patient profile tab access (0E-C31) ─────────────────────────────────────
// Each mirrors the @Roles() list of the exact backend endpoint the tab calls,
// so a tab never renders for a role that would 403 opening it. Timeline and
// Prescriptions both call GET /patients/:id/timeline (medical-timeline.controller.ts)
// and so both reuse CLINICAL_ROLES above rather than a separate constant —
// if that endpoint's roles ever change, update both call sites together.
export const PATIENT_APPOINTMENTS_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'DOCTOR', 'NURSE']);
export const PATIENT_LABS_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN', 'SECRETARY']);
export const PATIENT_RADIOLOGY_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN', 'SECRETARY']);
export const PATIENT_FILES_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY', 'TECHNICIAN']);
export const PATIENT_REPORTS_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY']);

// ─── Technician worklist pages ────────────────────────────────────────────────

export const TECHNICIAN_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'TECHNICIAN']);

// ─── Medical services work queue page access ─────────────────────────────────
// SUPER_ADMIN included here even though it's excluded from
// NAV_MEDICAL_SERVICES_QUEUE_ROLES above — mirrors TECHNICIAN_ACCESS_ROLES'
// direct-URL-access convention.
export const MEDICAL_SERVICES_QUEUE_ACCESS_ROLES = new Set([
  'SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN', 'SECRETARY',
]);

// ─── Billing & cashier page access ───────────────────────────────────────────

export const BILLING_ACCESS_ROLES        = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);
export const BILLING_REPORT_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);

// Read-only invoice access: patient-scoped endpoints only (invoices tab + outstanding balance on patient profile).
// Global /invoices list remains gated on BILLING_ACCESS_ROLES (org-wide, not doctor-scoped).
export const INVOICE_READ_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY', 'DOCTOR']);

// ─── Queue page action gates ──────────────────────────────────────────────────

export const QUEUE_CREATE_ROLES  = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
export const QUEUE_TRIAGE_ROLES  = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'NURSE']);
