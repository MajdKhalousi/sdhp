import type { Branch } from './branch';
import type { StaffUser } from './staff';

export type OrganizationType = 'HOSPITAL' | 'CLINIC' | 'POLYCLINIC';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';

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
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string | null;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  subscriptionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardInitialBranch {
  name: string;
  nameAr?: string;
  phone?: string;
  address?: string;
}

export interface OnboardInitialAdmin {
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone: string;
  email?: string;
  password: string;
}

export interface OnboardOrganizationDto {
  name: string;
  nameAr?: string;
  type?: OrganizationType;
  phone?: string;
  email?: string;
  address?: string;
  initialBranch: OnboardInitialBranch;
  initialAdmin: OnboardInitialAdmin;
}

export interface OnboardOrganizationResponse {
  organization: Organization;
  branch: Branch;
  admin: StaffUser;
}

export interface UpdateOrganizationInput {
  name?: string;
  nameAr?: string;
  type?: OrganizationType;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OrganizationStatusUpdateInput {
  isActive: boolean;
}

export interface OrganizationSubscriptionUpdateInput {
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: string | null;
  subscriptionStartAt?: string | null;
  subscriptionEndAt?: string | null;
  subscriptionNotes?: string | null;
}
