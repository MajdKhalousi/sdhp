export type PayrollRunStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const PAYROLL_RUN_STATUSES: PayrollRunStatus[] = ['DRAFT', 'APPROVED', 'PAID', 'CANCELLED'];

export interface PayrollLine {
  id: string;
  payrollRunId: string;
  employeeProfileId: string;
  baseSalarySnapshot: string;
  currencySnapshot: string;
  additions: string;
  deductions: string;
  netSalary: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employeeProfile: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    jobTitle: string | null;
  };
}

export interface PayrollRun {
  id: string;
  organizationId: string;
  year: number;
  month: number;
  status: PayrollRunStatus;
  generatedById: string;
  generatedAt: string;
  approvedById: string | null;
  approvedAt: string | null;
  paidById: string | null;
  paidAt: string | null;
  cancelledById: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Present on GET /v1/payroll/runs (list) only.
  _count?: { lines: number };
  // Present on POST /v1/payroll/runs and GET /v1/payroll/runs/:id (detail) only.
  lines?: PayrollLine[];
}

export interface CreatePayrollRunPayload {
  year: number;
  month: number;
}

export interface UpdatePayrollLinePayload {
  additions?: number;
  deductions?: number;
  notes?: string;
}

export interface CancelPayrollRunPayload {
  cancelReason?: string;
}

export interface PayrollRunQueueResult {
  data: PayrollRun[];
  total: number;
  page: number;
  limit: number;
}
