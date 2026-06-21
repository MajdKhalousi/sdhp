export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY' | 'OTHER';

export const LEAVE_TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'OTHER'];

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const LEAVE_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export interface LeaveRequest {
  id: string;
  organizationId: string;
  employeeProfileId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string | null;
  decisionNote: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveQueueRecord extends LeaveRequest {
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

export interface CreateLeaveRequestPayload {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export type UpdateLeaveRequestPayload = Partial<CreateLeaveRequestPayload>;

export interface LeaveDecisionPayload {
  decisionNote?: string;
}

export interface LeaveQueueResult {
  data: LeaveQueueRecord[];
  total: number;
  page: number;
  limit: number;
}
