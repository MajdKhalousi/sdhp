import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, QueueStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';
import { MedicalTimelineEventType } from '@prisma/client';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { DoctorSchedulesService } from '../doctor-schedules/doctor-schedules.service';
import { BillingService } from '../billing/billing.service';
import { SubscriptionAccessService } from '../../common/subscription/subscription-access.service';

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
} as const;

const DOCTOR_SELECT = {
  id: true,
  specialization: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
} as const;

const SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  patientId: true,
  doctorId: true,
  visitTypeId: true,
  sourceEncounterId: true,
  scheduledAt: true,
  durationMin: true,
  status: true,
  notes: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: PATIENT_SELECT },
  doctor: { select: DOCTOR_SELECT },
} as const;

type AppointmentRecord = Prisma.AppointmentGetPayload<{ select: typeof SELECT }>;

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]:  [AppointmentStatus.CONFIRMED,   AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.CONFIRMED]:  [AppointmentStatus.CHECKED_IN,  AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.CHECKED_IN]: [AppointmentStatus.IN_QUEUE,    AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED],
  [AppointmentStatus.IN_QUEUE]:   [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED],
  [AppointmentStatus.IN_PROGRESS]:[AppointmentStatus.COMPLETED,   AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]:  [],
  [AppointmentStatus.CANCELLED]:  [AppointmentStatus.SCHEDULED],
  [AppointmentStatus.NO_SHOW]:    [AppointmentStatus.SCHEDULED],
};

// PATCH /appointments/:id is shared by reschedule (new/changed obligation) and
// cancel/confirm/no-show (correction/cleanup of existing work). Only a pure
// status-only update to one of these three values is exempt from the
// subscription write block — any other field, or any other status
// (including a direct CHECKED_IN attempt), still requires an active subscription.
const OBLIGATION_CHANGING_FIELDS = [
  'scheduledAt',
  'durationMin',
  'branchId',
  'visitTypeId',
  'sourceEncounterId',
] as const;

const SUBSCRIPTION_EXEMPT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.NO_SHOW,
];

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private timelineWriter: MedicalTimelineWriterService,
    private auditWriter: AuditLogsWriterService,
    private doctorSchedulesService: DoctorSchedulesService,
    private billingService: BillingService,
    private subscriptionAccess: SubscriptionAccessService,
  ) {}

  async findAll(query: AppointmentQueryDto, caller: JwtPayload): Promise<PaginatedResponse<AppointmentRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = await this.buildWhere(query, caller);

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({ where, select: SELECT, orderBy: { scheduledAt: 'desc' }, skip, take: limit }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appt.organizationId, caller);
    return appt;
  }

  async create(dto: CreateAppointmentDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);

    await this.validatePatient(dto.patientId, caller);
    await this.validateDoctor(dto.doctorId, organizationId);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }

    if (dto.visitTypeId) {
      await this.assertVisitTypeBelongsToOrg(dto.visitTypeId, organizationId);
    }

    const scheduledAt = new Date(dto.scheduledAt);
    const durationMin = dto.durationMin ?? 30;

    await this.doctorSchedulesService.assertDoctorAvailability(
      dto.doctorId,
      scheduledAt,
      durationMin,
      organizationId,
    );
    await this.assertNoDoubleBooking(dto.doctorId, scheduledAt, durationMin);

    if (dto.sourceEncounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: { id: dto.sourceEncounterId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!enc) throw new BadRequestException('Source encounter not found in this organization');

      const existingFollowUp = await this.prisma.appointment.findFirst({
        where: {
          sourceEncounterId: dto.sourceEncounterId,
          status: { notIn: [AppointmentStatus.CANCELLED] },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existingFollowUp) {
        throw new ConflictException('Follow-up appointment already exists for this encounter');
      }
    }

    const result = await this.prisma.appointment.create({
      data: {
        organizationId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        visitTypeId: dto.visitTypeId,
        sourceEncounterId: dto.sourceEncounterId,
        scheduledAt,
        durationMin,
        status: dto.status,
        notes: dto.notes,
        cancelReason: dto.cancelReason,
        branchId: dto.branchId,
      },
      select: SELECT,
    });
    await this.timelineWriter.log({
      organizationId,
      patientId: result.patientId,
      eventType: MedicalTimelineEventType.APPOINTMENT_BOOKED,
      createdById: caller.sub,
      metadata: { appointmentId: result.id, scheduledAt: result.scheduledAt.toISOString() },
    });

    if (dto.sourceEncounterId) {
      await this.timelineWriter.log({
        organizationId,
        patientId: result.patientId,
        eventType: MedicalTimelineEventType.FOLLOW_UP_BOOKED,
        createdById: caller.sub,
        metadata: {
          appointmentId: result.id,
          appointmentDate: result.scheduledAt.toISOString(),
          doctorId: result.doctorId,
        },
      });
    }

    await this.auditWriter.log({
      caller,
      action: 'CREATE',
      resource: 'appointment',
      resourceId: result.id,
      newData: toSnapshot({
        id: result.id,
        patientId: result.patientId,
        doctorId: result.doctorId,
        scheduledAt: result.scheduledAt,
        durationMin: result.durationMin,
        status: result.status,
        branchId: result.branchId,
      }),
    });
    return result;
  }

  async update(id: string, dto: UpdateAppointmentDto, caller: JwtPayload) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        cancelledAt: true,
        status: true,
        doctorId: true,
        scheduledAt: true,
        durationMin: true,
      },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appt.organizationId, caller);

    if (this.isObligationChangingUpdate(dto)) {
      await this.subscriptionAccess.assertWriteAllowed(caller, {
        resource: 'appointments',
        resourceId: id,
      });
    }

    if (dto.status && dto.status !== appt.status) {
      const allowed = VALID_TRANSITIONS[appt.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transition from ${appt.status} to ${dto.status} is not allowed`,
        );
      }
    }

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, appt.organizationId);
    }

    if (dto.visitTypeId) {
      await this.assertVisitTypeBelongsToOrg(dto.visitTypeId, appt.organizationId);
    }

    if (dto.scheduledAt !== undefined || dto.durationMin !== undefined) {
      const newScheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : appt.scheduledAt;
      const newDurationMin = dto.durationMin ?? appt.durationMin;
      await this.doctorSchedulesService.assertDoctorAvailability(
        appt.doctorId,
        newScheduledAt,
        newDurationMin,
        appt.organizationId,
        id,
      );
      await this.assertNoDoubleBooking(appt.doctorId, newScheduledAt, newDurationMin, id);
    }

    const isStatusTransition = !!(dto.status && dto.status !== appt.status);

    const cancelledAt =
      dto.status === AppointmentStatus.CANCELLED && !appt.cancelledAt
        ? new Date()
        : undefined;

    if (dto.status === AppointmentStatus.CANCELLED) {
      // Remove any active queue entry so the board never shows a cancelled appointment.
      await this.prisma.queueEntry.deleteMany({
        where: {
          appointmentId: id,
          status: { in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS] },
        },
      });
    }

    const result = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        cancelledAt,
      },
      select: SELECT,
    });

    if (isStatusTransition) {
      await this.auditWriter.log({
        caller,
        action: 'STATUS_TRANSITION',
        resource: 'appointment',
        resourceId: id,
        oldData: toSnapshot({ status: appt.status }),
        newData: toSnapshot({ status: dto.status }),
      });

      if (
        dto.status === AppointmentStatus.IN_QUEUE ||
        dto.status === AppointmentStatus.IN_PROGRESS
      ) {
        // Trigger on IN_QUEUE (Check In) or IN_PROGRESS; idempotency check inside prevents duplicates.
        await this.billingService.autoCreateInvoiceForAppointment(
          {
            id: result.id,
            organizationId: result.organizationId,
            branchId: result.branchId,
            patientId: result.patientId,
            visitTypeId: result.visitTypeId,
            sourceEncounterId: result.sourceEncounterId,
          },
          caller.sub,
        ).catch((err) => {
          this.logger.error(`AUTO_INVOICE_FAILED appointmentId=${id}`, err);
        });
      } else if (
        dto.status === AppointmentStatus.CANCELLED ||
        dto.status === AppointmentStatus.NO_SHOW
      ) {
        // Auto-cancel the DRAFT invoice if one exists; ISSUED/PAID are never touched.
        await this.billingService.autoCancelDraftInvoiceForAppointment(id)
          .catch((err) => {
            this.logger.error(`AUTO_CANCEL_DRAFT_INVOICE_FAILED appointmentId=${id}`, err);
          });
      }
    } else {
      await this.auditWriter.log({
        caller,
        action: 'UPDATE',
        resource: 'appointment',
        resourceId: id,
        newData: toSnapshot({
          ...(dto.scheduledAt !== undefined ? { scheduledAt: dto.scheduledAt } : {}),
          ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
          ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        }),
      });
    }

    return result;
  }

  async remove(id: string, caller: JwtPayload) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true, patientId: true, doctorId: true, scheduledAt: true, durationMin: true, status: true, branchId: true },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appt.organizationId, caller);

    await this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditWriter.log({
      caller,
      action: 'SOFT_DELETE',
      resource: 'appointment',
      resourceId: id,
      oldData: toSnapshot({
        id: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        scheduledAt: appt.scheduledAt,
        durationMin: appt.durationMin,
        status: appt.status,
        branchId: appt.branchId,
      }),
    });
  }

  private async buildWhere(query: AppointmentQueryDto, caller: JwtPayload): Promise<Prisma.AppointmentWhereInput> {
    const dateFilter = query.date ? this.buildDayRange(query.date) : undefined;

    const queryFilters: Prisma.AppointmentWhereInput = {
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(dateFilter ? { scheduledAt: dateFilter } : {}),
      ...(query.sourceEncounterId ? { sourceEncounterId: query.sourceEncounterId } : {}),
    };

    if (caller.role === UserRole.SUPER_ADMIN) {
      return {
        ...queryFilters,
        ...(query.organizationId ? { organizationId: query.organizationId } : {}),
        ...(query.doctorId ? { doctorId: query.doctorId } : {}),
        deletedAt: null,
      };
    }

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      return {
        ...queryFilters,
        organizationId: caller.organizationId,
        // DOCTOR is always scoped to their own profile; query.doctorId is ignored for security.
        ...(doctorProfile ? { doctorId: doctorProfile.id } : {}),
        deletedAt: null,
      };
    }

    return {
      ...queryFilters,
      organizationId: caller.organizationId,
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      deletedAt: null,
    };
  }

  private buildDayRange(date: string): { gte: Date; lt: Date } {
    // 'date' is a calendar date in Asia/Damascus (UTC+3, no DST since 2022).
    // Damascus midnight = date T00:00:00+03:00 = (date-1)T21:00:00Z.
    const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
    const start = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - TZ_OFFSET_MS);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { gte: start, lt: end };
  }

  private isObligationChangingUpdate(dto: UpdateAppointmentDto): boolean {
    const hasObligationField = OBLIGATION_CHANGING_FIELDS.some(
      (field) => dto[field] !== undefined,
    );
    if (hasObligationField) return true;

    if (dto.status === undefined) return false;
    return !SUBSCRIPTION_EXEMPT_STATUSES.includes(dto.status);
  }

  private assertOwnership(apptOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (apptOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this appointment is not allowed');
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
      throw new ForbiddenException('Cannot create an appointment for another organization');
    }
    return caller.organizationId;
  }

  private async validatePatient(patientId: string, caller: JwtPayload): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, isActive: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (!patient.isActive) throw new BadRequestException('Patient is inactive');
    await assertPatientLinkedToOrg(this.prisma, patientId, caller);
  }

  private async validateDoctor(doctorId: string, organizationId: string): Promise<void> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, deletedAt: null },
      select: { id: true, isActive: true, user: { select: { organizationId: true } } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.isActive) throw new BadRequestException('Doctor is inactive');
    if (doctor.user.organizationId !== organizationId) {
      throw new ForbiddenException('Doctor does not belong to this organization');
    }
  }

  private async assertNoDoubleBooking(
    doctorId: string,
    scheduledAt: Date,
    durationMin: number,
    excludeId?: string,
  ): Promise<void> {
    const proposedEnd = new Date(scheduledAt.getTime() + durationMin * 60_000);

    // Fetch candidates in a generous ±12-hour window to avoid full-table scan.
    const windowStart = new Date(scheduledAt.getTime() - 12 * 60 * 60_000);
    const windowEnd = new Date(scheduledAt.getTime() + 12 * 60 * 60_000);

    const candidates = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        deletedAt: null,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        scheduledAt: { gte: windowStart, lt: windowEnd },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, scheduledAt: true, durationMin: true },
    });

    for (const existing of candidates) {
      const existingEnd = new Date(
        existing.scheduledAt.getTime() + (existing.durationMin ?? 30) * 60_000,
      );
      if (scheduledAt < existingEnd && proposedEnd > existing.scheduledAt) {
        throw new ConflictException(
          `Doctor already has an appointment at ${existing.scheduledAt.toISOString()} that overlaps with the requested time slot`,
        );
      }
    }
  }

  private async assertBranchBelongsToOrg(branchId: string, organizationId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException(
        'Branch does not belong to this organization or does not exist',
      );
    }
  }

  private async assertVisitTypeBelongsToOrg(
    visitTypeId: string,
    organizationId: string,
  ): Promise<void> {
    const vt = await this.prisma.visitType.findFirst({
      where: { id: visitTypeId, organizationId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!vt) {
      throw new BadRequestException(
        'Visit type not found or not active in this organization',
      );
    }
  }
}
