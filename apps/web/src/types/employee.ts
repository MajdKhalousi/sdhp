import type { StaffRole } from './staff';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type EmployeeGender = 'MALE' | 'FEMALE';
export type EmployeeAccountMode = 'NONE' | 'LINK_EXISTING' | 'CREATE_NEW';

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];
export const EMPLOYEE_GENDERS: EmployeeGender[] = ['MALE', 'FEMALE'];
export const EMPLOYEE_ACCOUNT_MODES: EmployeeAccountMode[] = ['NONE', 'LINK_EXISTING', 'CREATE_NEW'];

export interface LinkedUserRef {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  organizationId: string;
}

export interface EmployeeProfile {
  id: string;
  organizationId: string;
  userId: string | null;
  branchId: string | null;
  departmentId: string | null;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  jobTitle: string | null;
  departmentFreeText: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  dateOfBirth: string | null;
  gender: EmployeeGender | null;
  address: string | null;
  hireDate: string | null;
  contractStartAt: string | null;
  contractEndAt: string | null;
  employmentStatus: EmploymentStatus;
  baseSalary: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: LinkedUserRef | null;
}

// Deliberately does not repeat firstName/lastName/firstNameAr/lastNameAr —
// the backend copies those from CreateEmployeeDto's own fields when
// accountMode is CREATE_NEW.
export interface CreateEmployeeAccountDto {
  phone: string;
  email?: string;
  password: string;
  role: StaffRole;
  isActive?: boolean;
}

export interface CreateEmployeeDto {
  accountMode?: EmployeeAccountMode;
  account?: CreateEmployeeAccountDto;
  userId?: string | null;
  branchId?: string;
  departmentId?: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  jobTitle?: string;
  departmentFreeText?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: EmployeeGender;
  address?: string;
  hireDate?: string;
  contractStartAt?: string;
  contractEndAt?: string;
  employmentStatus?: EmploymentStatus;
  baseSalary?: number;
  currency?: string;
  notes?: string;
}

// accountMode/account excluded — account creation is create-time-only (146B/146C);
// edit continues to support only the existing userId link/unlink behavior.
export type UpdateEmployeeDto = Partial<Omit<CreateEmployeeDto, 'accountMode' | 'account'>>;

export interface EmployeesResponse {
  data: EmployeeProfile[];
  total: number;
  page: number;
  limit: number;
}
