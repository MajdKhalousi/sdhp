import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { EmployeesService } from './employees.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { DailyAttendanceQueryDto } from './dto/daily-attendance-query.dto';

const ATTENDANCE_SELECT = {
  id: true,
  organizationId: true,
  employeeProfileId: true,
  date: true,
  status: true,
  checkInAt: true,
  checkOutAt: true,
  notes: true,
  recordedById: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Minimal employee fields needed for a future roster table — never includes
// passwordHash (the User relation isn't selected at all here).
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

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private employeesService: EmployeesService,
  ) {}

  // Calendar date stored as midnight UTC — same convention as
  // DoctorScheduleException. Accepts either a date-only ("YYYY-MM-DD") or
  // full ISO datetime string and normalizes to the date portion.
  private toMidnightUtc(dateInput: string): Date {
    return new Date(`${dateInput.slice(0, 10)}T00:00:00.000Z`);
  }

  async create(employeeProfileId: string, dto: CreateAttendanceDto, caller: JwtPayload) {
    const profile = await this.employeesService.findOne(employeeProfileId, caller);

    try {
      const result = await this.prisma.attendanceRecord.create({
        data: {
          organizationId: profile.organizationId,
          employeeProfileId,
          date: this.toMidnightUtc(dto.date),
          status: dto.status,
          checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : undefined,
          checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : undefined,
          notes: dto.notes,
          recordedById: caller.sub,
        },
        select: ATTENDANCE_SELECT,
      });

      await this.auditWriter.log({
        caller,
        action: 'ATTENDANCE_RECORD_CREATED',
        resource: 'attendance_record',
        resourceId: result.id,
        newData: toSnapshot({
          employeeProfileId: result.employeeProfileId,
          date: result.date,
          status: result.status,
          checkInAt: result.checkInAt,
          checkOutAt: result.checkOutAt,
          notes: result.notes,
        }),
      });

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An attendance record already exists for this employee on this date');
      }
      throw e;
    }
  }

  async findAllForEmployee(employeeProfileId: string, query: AttendanceQueryDto, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller, { includeDeleted: true });

    return this.prisma.attendanceRecord.findMany({
      where: {
        employeeProfileId,
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: this.toMidnightUtc(query.from) } : {}),
                ...(query.to ? { lte: this.toMidnightUtc(query.to) } : {}),
              },
            }
          : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: ATTENDANCE_SELECT,
      orderBy: { date: 'desc' },
    });
  }

  async update(employeeProfileId: string, id: string, dto: UpdateAttendanceDto, caller: JwtPayload) {
    await this.employeesService.findOne(employeeProfileId, caller);
    const existing = await this.fetchRecord(employeeProfileId, id);

    try {
      const result = await this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          date: dto.date ? this.toMidnightUtc(dto.date) : undefined,
          status: dto.status,
          checkInAt: dto.checkInAt !== undefined ? (dto.checkInAt ? new Date(dto.checkInAt) : null) : undefined,
          checkOutAt: dto.checkOutAt !== undefined ? (dto.checkOutAt ? new Date(dto.checkOutAt) : null) : undefined,
          notes: dto.notes,
        },
        select: ATTENDANCE_SELECT,
      });

      await this.auditWriter.log({
        caller,
        action: 'ATTENDANCE_RECORD_UPDATED',
        resource: 'attendance_record',
        resourceId: result.id,
        oldData: toSnapshot({
          date: existing.date,
          status: existing.status,
          checkInAt: existing.checkInAt,
          checkOutAt: existing.checkOutAt,
          notes: existing.notes,
        }),
        newData: toSnapshot({
          employeeProfileId: result.employeeProfileId,
          date: result.date,
          status: result.status,
          checkInAt: result.checkInAt,
          checkOutAt: result.checkOutAt,
          notes: result.notes,
        }),
      });

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An attendance record already exists for this employee on this date');
      }
      throw e;
    }
  }

  // Org-wide roster view for one date — read-only, so no existence check on
  // the organization itself is needed (an unknown/foreign organizationId
  // from a SUPER_ADMIN simply yields an empty list, with no write at stake).
  async findAllForOrgOnDate(query: DailyAttendanceQueryDto, caller: JwtPayload) {
    const organizationId = this.resolveOrgIdForRead(query.organizationId, caller);
    const date = this.toMidnightUtc(query.date);

    return this.prisma.attendanceRecord.findMany({
      where: { organizationId, date },
      select: {
        ...ATTENDANCE_SELECT,
        employeeProfile: { select: ROSTER_EMPLOYEE_SELECT },
      },
      orderBy: { employeeProfile: { lastName: 'asc' } },
    });
  }

  private resolveOrgIdForRead(queryOrgId: string | undefined, caller: JwtPayload): string {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!queryOrgId) throw new BadRequestException('organizationId is required for SUPER_ADMIN');
      return queryOrgId;
    }
    return caller.organizationId;
  }

  private async fetchRecord(employeeProfileId: string, id: string) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id, employeeProfileId },
      select: ATTENDANCE_SELECT,
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    return record;
  }
}
