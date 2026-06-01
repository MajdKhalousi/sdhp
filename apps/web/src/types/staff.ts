export type StaffRole =
  | 'ORG_ADMIN'
  | 'SECRETARY'
  | 'DOCTOR'
  | 'NURSE'
  | 'ACCOUNTANT'
  | 'TECHNICIAN';

export const STAFF_ROLES: StaffRole[] = [
  'ORG_ADMIN',
  'SECRETARY',
  'DOCTOR',
  'NURSE',
  'ACCOUNTANT',
  'TECHNICIAN',
];

export interface StaffUser {
  id: string;
  organizationId: string;
  branchId: string | null;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDto {
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone: string;
  email?: string;
  password: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateStaffDto {
  firstName?: string;
  lastName?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}
