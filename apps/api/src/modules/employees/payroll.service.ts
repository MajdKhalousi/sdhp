import { BadRequestException, ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, PayrollRunStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { PayrollRunQueryDto } from './dto/payroll-run-query.dto';
import { UpdatePayrollLineDto } from './dto/update-payroll-line.dto';
import { CancelPayrollRunDto } from './dto/cancel-payroll-run.dto';

const RUN_SELECT = {
  id: true,
  organizationId: true,
  year: true,
  month: true,
  status: true,
  generatedById: true,
  generatedAt: true,
  approvedById: true,
  approvedAt: true,
  paidById: true,
  paidAt: true,
  cancelledById: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

const LINE_EMPLOYEE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  jobTitle: true,
} as const;

const LINE_SELECT = {
  id: true,
  payrollRunId: true,
  employeeProfileId: true,
  baseSalarySnapshot: true,
  currencySnapshot: true,
  additions: true,
  deductions: true,
  netSalary: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  employeeProfile: { select: LINE_EMPLOYEE_SELECT },
} as const;

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  // Generates one DRAFT run for every active EmployeeProfile (not soft-deleted,
  // employmentStatus ACTIVE). All active employees must have a baseSalary
  // set, checked up front — generation must never silently skip someone an
  // Org Admin would reasonably expect to be paid (Phase 148B-1). No run/line
  // is created, and no audit log is written, unless every active employee
  // is eligible.
  async create(dto: CreatePayrollRunDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);

    const activeEmployees = await this.prisma.employeeProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        employmentStatus: 'ACTIVE',
      },
      select: { id: true, baseSalary: true, currency: true },
    });

    if (activeEmployees.length === 0) {
      throw new BadRequestException(
        'No active employees with a base salary set were found for payroll generation',
      );
    }

    const missingBaseSalary = activeEmployees.some((emp) => emp.baseSalary === null);
    if (missingBaseSalary) {
      throw new BadRequestException(
        'Cannot generate payroll because one or more active employees are missing a base salary.',
      );
    }

    const eligibleEmployees = activeEmployees;

    try {
      const result = await this.prisma.payrollRun.create({
        data: {
          organizationId,
          year: dto.year,
          month: dto.month,
          generatedById: caller.sub,
          lines: {
            create: eligibleEmployees.map((emp) => ({
              employeeProfileId: emp.id,
              baseSalarySnapshot: emp.baseSalary as Prisma.Decimal,
              currencySnapshot: emp.currency,
              netSalary: emp.baseSalary as Prisma.Decimal,
            })),
          },
        },
        select: { ...RUN_SELECT, lines: { select: LINE_SELECT } },
      });

      await this.auditWriter.log({
        caller,
        action: 'PAYROLL_RUN_GENERATED',
        resource: 'payroll_run',
        resourceId: result.id,
        newData: toSnapshot({
          organizationId: result.organizationId,
          year: result.year,
          month: result.month,
          status: result.status,
          lineCount: result.lines.length,
        }),
      });

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A payroll run already exists for this organization/year/month');
      }
      throw e;
    }
  }

  async findAllForOrg(query: PayrollRunQueryDto, caller: JwtPayload) {
    const organizationId = this.resolveOrgIdForRead(query.organizationId, caller);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PayrollRunWhereInput = {
      organizationId,
      ...(query.year ? { year: query.year } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payrollRun.findMany({
        where,
        select: { ...RUN_SELECT, _count: { select: { lines: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payrollRun.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      select: { ...RUN_SELECT, lines: { select: LINE_SELECT } },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertOwnership(run.organizationId, caller);
    return run;
  }

  // additions/deductions/notes only — only while DRAFT. netSalary is always
  // recomputed server-side from baseSalarySnapshot + additions - deductions
  // using Prisma.Decimal, never plain floating-point math (Phase 148A).
  async updateLine(runId: string, lineId: string, dto: UpdatePayrollLineDto, caller: JwtPayload) {
    const run = await this.fetchRun(runId, caller);
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw new BadRequestException('Payroll lines can only be edited while the run is in DRAFT status');
    }

    const existing = await this.prisma.payrollLine.findFirst({
      where: { id: lineId, payrollRunId: runId },
      select: { id: true, baseSalarySnapshot: true, additions: true, deductions: true, notes: true },
    });
    if (!existing) throw new NotFoundException('Payroll line not found');

    const additions = dto.additions ?? existing.additions;
    const deductions = dto.deductions ?? existing.deductions;
    const netSalary = existing.baseSalarySnapshot.plus(additions).minus(deductions);

    const result = await this.prisma.payrollLine.update({
      where: { id: existing.id },
      data: {
        additions,
        deductions,
        netSalary,
        notes: dto.notes,
      },
      select: LINE_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'PAYROLL_LINE_UPDATED',
      resource: 'payroll_line',
      resourceId: result.id,
      oldData: toSnapshot({
        additions: existing.additions,
        deductions: existing.deductions,
        notes: existing.notes,
      }),
      newData: toSnapshot({
        employeeProfileId: result.employeeProfileId,
        additions: result.additions,
        deductions: result.deductions,
        netSalary: result.netSalary,
        notes: result.notes,
      }),
    });

    return result;
  }

  async approve(id: string, caller: JwtPayload) {
    const run = await this.fetchRun(id, caller);
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw new BadRequestException('Only a DRAFT payroll run can be approved');
    }

    const result = await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: PayrollRunStatus.APPROVED, approvedById: caller.sub, approvedAt: new Date() },
      select: RUN_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'PAYROLL_RUN_APPROVED',
      resource: 'payroll_run',
      resourceId: result.id,
      oldData: toSnapshot({ status: run.status }),
      newData: toSnapshot({ status: result.status, approvedById: result.approvedById, approvedAt: result.approvedAt }),
    });

    return result;
  }

  // Bookkeeping only — does not execute any real payment, does not touch
  // billing/invoices/cashier (Phase 148A constraint).
  async markPaid(id: string, caller: JwtPayload) {
    const run = await this.fetchRun(id, caller);
    if (run.status !== PayrollRunStatus.APPROVED) {
      throw new BadRequestException('Only an APPROVED payroll run can be marked as paid');
    }

    const result = await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: PayrollRunStatus.PAID, paidById: caller.sub, paidAt: new Date() },
      select: RUN_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'PAYROLL_RUN_MARKED_PAID',
      resource: 'payroll_run',
      resourceId: result.id,
      oldData: toSnapshot({ status: run.status }),
      newData: toSnapshot({ status: result.status, paidById: result.paidById, paidAt: result.paidAt }),
    });

    return result;
  }

  async cancel(id: string, dto: CancelPayrollRunDto, caller: JwtPayload) {
    const run = await this.fetchRun(id, caller);
    if (run.status !== PayrollRunStatus.DRAFT && run.status !== PayrollRunStatus.APPROVED) {
      throw new BadRequestException('Only a DRAFT or APPROVED payroll run can be cancelled');
    }

    const result = await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: PayrollRunStatus.CANCELLED,
        cancelledById: caller.sub,
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
      },
      select: RUN_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'PAYROLL_RUN_CANCELLED',
      resource: 'payroll_run',
      resourceId: result.id,
      oldData: toSnapshot({ status: run.status }),
      newData: toSnapshot({
        status: result.status,
        cancelledById: result.cancelledById,
        cancelledAt: result.cancelledAt,
        cancelReason: result.cancelReason,
      }),
    });

    return result;
  }

  private async fetchRun(id: string, caller: JwtPayload) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      select: { id: true, organizationId: true, status: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertOwnership(run.organizationId, caller);
    return run;
  }

  private assertOwnership(runOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (runOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this payroll run is not allowed');
    }
  }

  private async resolveOrgId(dtoOrgId: string | undefined, caller: JwtPayload): Promise<string> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!dtoOrgId) throw new BadRequestException('organizationId is required for SUPER_ADMIN');
      const org = await this.prisma.organization.findFirst({
        where: { id: dtoOrgId, deletedAt: null },
        select: { id: true },
      });
      if (!org) throw new NotFoundException('Organization not found');
      return dtoOrgId;
    }

    if (dtoOrgId && dtoOrgId !== caller.organizationId) {
      throw new ForbiddenException('Cannot generate payroll for another organization');
    }
    return caller.organizationId;
  }

  private resolveOrgIdForRead(queryOrgId: string | undefined, caller: JwtPayload): string {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!queryOrgId) throw new BadRequestException('organizationId is required for SUPER_ADMIN');
      return queryOrgId;
    }
    return caller.organizationId;
  }
}
