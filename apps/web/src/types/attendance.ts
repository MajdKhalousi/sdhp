export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
];

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  employeeProfileId: string;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendanceRecord extends AttendanceRecord {
  employeeProfile: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    jobTitle: string | null;
    employmentStatus: string;
    branchId: string | null;
    departmentId: string | null;
    userId: string | null;
  };
}

export interface CreateAttendancePayload {
  date: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
}

// checkInAt/checkOutAt additionally accept null on update — explicit null
// clears a previously-set value; omitting the field leaves it unchanged
// (the backend already distinguishes these, see attendance.service.ts).
export type UpdateAttendancePayload = Partial<Omit<CreateAttendancePayload, 'checkInAt' | 'checkOutAt'>> & {
  checkInAt?: string | null;
  checkOutAt?: string | null;
};
