import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { EmployeesService } from './employees.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveDecisionDto } from './dto/leave-decision.dto';
import { LeaveRequestQueryDto } from './dto/leave-request-query.dto';
import { LeaveQueueQueryDto } from './dto/leave-queue-query.dto';

const LEAVE_SELECT = {
  id: true,
  organizationId: true,
  employeeProfileId: true,
  type: true,
  startDate: true,
  endDate: true,
  status: true,
  reason: true,
  decisionNote: true,
  decidedById: true,
  decidedAt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ROSTER_EMPLOYEE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  jobTitle: true,
  employmentStatus: true,
  branchId: true,
  departmentId: true,
  userId: true,
} as const;

const ACTIVE_LEAVE_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED'];

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private employeesService: EmployeesService,
  ) {}

  // Calendar date stored as midnight UTC — same convention as AttendanceRecord.
  private toMidnightUtc(dateInput: string): Date {
    return new Date(`${dateInput.slice(0, 10)}T00:00:00.000Z`);
  }

  private async assertNoOverlap(
    employeeProfileId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeProfileId,
        status: { in: ACTIVE_LEAVE_STATUSES },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new ConflictException('An overlapping leave request already exists for this employee');
    }
  }

  async create(employeeProfileId: string, dto: CreateLeaveRequestDto, caller: JwtPayload) {
    const profile = await this.employeesService.findOne(employeeProfileId, caller);

    const startDate = this.toMidnightUtc(dto.startDate);
    const endDate = this.toMidnightUtc(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    await this.assertNoOverlap(employeeProfileId, startDate, endDate);

    const result = await this.prisma.leaveRequest.create({
      data: {
        organizationId: profile.organizationId,
        employeeProfileId,
        type: dto.type,
        startDate,
        endDate,
        reason: dto.reason,
        createdById: caller.sub,
      },
      select: LEAVE_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'LEAVE_REQUEST_CREATED',
      resource: 'leave_request',
      resourceId: result.id,
      newData: toSnapshot({
        employeeProfileId: result.employeeProfileId,
        type: result.type,
        startDate: result.startDate,
        endDate: result.endDate,
        status: result.status,
        reason: result.reason,
      }),
    });

    return result;
  }

  async findAllForEmployee(employeeProfileId: string, query: LeaveRequestQueryDto, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller, { includeDeleted: true });

    return this.prisma.leaveRequest.findMany({
      where: {
        employeeProfileId,
        ...(query.status ? { status: query.status } : {}),
      },
      select: LEAVE_SELECT,
      orderBy: { startDate: 'desc' },
    });
  }

  async update(employeeProfileId: string, id: string, dto: UpdateLeaveRequestDto, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller);
    const existing = await this.fetchRecord(employeeProfileId, id);

    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Only pending leave requests can be edited');
    }

    const startDate = dto.startDate ? this.toMidnightUtc(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? this.toMidnightUtc(dto.endDate) : existing.endDate;
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    if (dto.startDate || dto.endDate) {
      await this.assertNoOverlap(employeeProfileId, startDate, endDate, existing.id);
    }

    const result = await this.prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        type: dto.type,
        startDate: dto.startDate ? startDate : undefined,
        endDate: dto.endDate ? endDate : undefined,
        reason: dto.reason,
      },
      select: LEAVE_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'LEAVE_REQUEST_UPDATED',
      resource: 'leave_request',
      resourceId: result.id,
      oldData: toSnapshot({
        type: existing.type,
        startDate: existing.startDate,
        endDate: existing.endDate,
        reason: existing.reason,
      }),
      newData: toSnapshot({
        employeeProfileId: result.employeeProfileId,
        type: result.type,
        startDate: result.startDate,
        endDate: result.endDate,
        reason: result.reason,
      }),
    });

    return result;
  }

  async approve(employeeProfileId: string, id: string, dto: LeaveDecisionDto, caller: JwtPayload) {
    return this.decide(employeeProfileId, id, 'APPROVED', dto, caller, ['PENDING'], 'Only pending leave requests can be approved');
  }

  async reject(employeeProfileId: string, id: string, dto: LeaveDecisionDto, caller: JwtPayload) {
    return this.decide(employeeProfileId, id, 'REJECTED', dto, caller, ['PENDING'], 'Only pending leave requests can be rejected');
  }

  // Cancellation is allowed from PENDING or APPROVED — an admin may need to
  // cancel already-approved leave before it starts. REJECTED/CANCELLED
  // requests are terminal and cannot be cancelled again.
  async cancel(employeeProfileId: string, id: string, dto: LeaveDecisionDto, caller: JwtPayload) {
    return this.decide(
      employeeProfileId,
      id,
      'CANCELLED',
      dto,
      caller,
      ['PENDING', 'APPROVED'],
      'Only pending or approved leave requests can be cancelled',
    );
  }

  private async decide(
    employeeProfileId: string,
    id: string,
    nextStatus: LeaveStatus,
    dto: LeaveDecisionDto,
    caller: JwtPayload,
    allowedFrom: LeaveStatus[],
    errorMessage: string,
  ) {
    await this.employeesService.findOne(employeeProfileId, caller);
    const existing = await this.fetchRecord(employeeProfileId, id);

    if (!allowedFrom.includes(existing.status)) {
      throw new BadRequestException(errorMessage);
    }

    const result = await this.prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        decisionNote: dto.decisionNote,
        decidedById: caller.sub,
        decidedAt: new Date(),
      },
      select: LEAVE_SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: `LEAVE_REQUEST_${nextStatus}`,
      resource: 'leave_request',
      resourceId: result.id,
      oldData: toSnapshot({ status: existing.status }),
      newData: toSnapshot({
        employeeProfileId: result.employeeProfileId,
        status: result.status,
        decisionNote: result.decisionNote,
        decidedById: result.decidedById,
        decidedAt: result.decidedAt,
      }),
    });

    return result;
  }

  // Org-wide leave queue — read-only, so no existence check on the
  // organization itself is needed (an unknown/foreign organizationId from a
  // SUPER_ADMIN simply yields an empty list, with no write at stake).
  async findAllForOrg(query: LeaveQueueQueryDto, caller: JwtPayload) {
    const organizationId = this.resolveOrgIdForRead(query.organizationId, caller);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: {
          organizationId,
          ...(query.status ? { status: query.status } : {}),
        },
        select: {
          ...LEAVE_SELECT,
          employeeProfile: { select: ROSTER_EMPLOYEE_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leaveRequest.count({
        where: {
          organizationId,
          ...(query.status ? { status: query.status } : {}),
        },
      }),
    ]);

    return { data, total, page, limit };
  }

  private resolveOrgIdForRead(queryOrgId: string | undefined, caller: JwtPayload): string {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!queryOrgId) throw new BadRequestException('organizationId is required for SUPER_ADMIN');
      return queryOrgId;
    }
    return caller.organizationId;
  }

  private async fetchRecord(employeeProfileId: string, id: string) {
    const record = await this.prisma.leaveRequest.findFirst({
      where: { id, employeeProfileId },
      select: LEAVE_SELECT,
    });
    if (!record) throw new NotFoundException('Leave request not found');
    return record;
  }
}
