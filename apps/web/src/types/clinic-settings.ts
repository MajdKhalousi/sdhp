// ─── Clinic Settings ──────────────────────────────────────────────────────────

export interface ClinicWorkingDay {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
}

export interface ClinicSettings {
  id: string;
  organizationId: string;
  defaultSlotMin: number;
  lunchStartTime: string | null;
  lunchEndTime: string | null;
  timezone: string;
  updatedAt: string;
  workingDays: ClinicWorkingDay[];
}

export interface UpsertClinicSettingsDto {
  defaultSlotMin?: number;
  lunchStartTime?: string;
  lunchEndTime?: string;
  timezone?: string;
}

export interface WorkingDayItemDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen?: boolean;
}

export interface UpsertWorkingDaysDto {
  days: WorkingDayItemDto[];
}

// ─── Visit Types ──────────────────────────────────────────────────────────────

export type VisitTypeCode =
  | 'CONSULTATION'
  | 'FOLLOW_UP'
  | 'EMERGENCY'
  | 'PROCEDURE'
  | 'FREE_VISIT';

export interface VisitType {
  id: string;
  organizationId: string;
  name: string;
  nameAr: string | null;
  code: VisitTypeCode;
  color: string | null;
  durationMinutes: number;
  basePrice: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitTypeDto {
  name: string;
  nameAr?: string;
  code: VisitTypeCode;
  color?: string;
  durationMinutes: number;
  basePrice?: number;
}

export interface UpdateVisitTypeDto {
  name?: string;
  nameAr?: string;
  color?: string;
  durationMinutes?: number;
  basePrice?: number | null;
  isActive?: boolean;
}

export interface VisitTypeQuery {
  includeInactive?: boolean;
}

// ─── Departments ─────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  nameAr: string | null;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  nameAr?: string;
  code?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  nameAr?: string;
  code?: string;
  isActive?: boolean;
}

// ─── Services ─────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  nameAr: string | null;
  code: string;
  departmentId: string | null;
  defaultPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: Department | null;
}

export interface CreateServiceDto {
  name: string;
  nameAr?: string;
  code: string;
  departmentId?: string;
  defaultPrice: number;
}

export interface UpdateServiceDto {
  name?: string;
  nameAr?: string;
  code?: string;
  departmentId?: string | null;
  defaultPrice?: number;
  isActive?: boolean;
}

export interface ServiceQuery {
  departmentId?: string;
  includeInactive?: boolean;
}
