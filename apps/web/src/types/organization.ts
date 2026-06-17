export type OrganizationType = 'HOSPITAL' | 'CLINIC' | 'POLYCLINIC';

export interface Organization {
  id: string;
  name: string;
  nameAr: string | null;
  type: OrganizationType;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
