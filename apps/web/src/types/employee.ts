export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type EmployeeGender = 'MALE' | 'FEMALE';

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];
export const EMPLOYEE_GENDERS: EmployeeGender[] = ['MALE', 'FEMALE'];

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

export interface CreateEmployeeDto {
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

export type UpdateEmployeeDto = Partial<CreateEmployeeDto>;

export interface EmployeesResponse {
  data: EmployeeProfile[];
  total: number;
  page: number;
  limit: number;
}
