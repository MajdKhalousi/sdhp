// Temporary frontend-only convention (Phase 135A) for flagging known demo/
// training organizations in the Platform portal. There is no
// Organization.isDemo field in the schema yet — this hardcoded ID list is a
// stopgap until that real field exists (planned Phase 135B), at which point
// this file should be removed in favor of reading org.isDemo from the API.
export const DEMO_ORGANIZATION_IDS: Set<string> = new Set([
  'seed-org-001',
  'seed-org-002',
  'cmqip7fcx000110ros439pbw4',
]);

export function isDemoOrganization(id: string | null | undefined): boolean {
  if (!id) return false;
  return DEMO_ORGANIZATION_IDS.has(id);
}
