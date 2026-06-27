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
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { UpdateQueueEntryDto } from './dto/update-queue-entry.dto';
import { TriageQueueEntryDto } from './dto/triage-queue-entry.dto';
import { QueueQueryDto } from './dto/queue-query.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';
import { MedicalTimelineEventType } from '@prisma/client';
import { BillingService } from '../billing/billing.service';

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  phone: true,
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

const APPOINTMENT_SELECT = {
  id: true,
  organizationId: true,
  scheduledAt: true,
  status: true,
  branchId: true,
  patientId: true,
  visitTypeId: true,
  sourceEncounterId: true,
  patient: { select: PATIENT_SELECT },
  doctor: { select: DOCTOR_SELECT },
} as const;

const SELECT = {
  id: true,
  appointmentId: true,
  organizationId: true,
  businessDate: true,
  ticketNumber: true,
  status: true,
  calledAt: true,
  completedAt: true,
  triageVitals: true,
  chiefComplaintDraft: true,
  createdAt: true,
  updatedAt: true,
  appointment: { select: APPOINTMENT_SELECT },
} as const;

type QueueEntryRecord = Prisma.QueueEntryGetPayload<{ select: typeof SELECT }>;

const CHECK_IN_BLOCKED_MESSAGES: Partial<Record<AppointmentStatus, string>> = {
  [AppointmentStatus.IN_QUEUE]:    'This appointment is already in the queue.',
  [AppointmentStatus.CANCELLED]:   'This appointment is cancelled and cannot be checked in.',
  [AppointmentStatus.COMPLETED]:   'This appointment is already completed.',
  [AppointmentStatus.NO_SHOW]:     'This appointment was marked as no-show and cannot be checked in.',
  [AppointmentStatus.IN_PROGRESS]: 'This appointment is already in progress.',
  [AppointmentStatus.CHECKED_IN]:  'This appointment has an inconsistent check-in state. Please contact admin.',
};

const QUEUE_TO_APPOINTMENT_STATUS: Partial<Record<QueueStatus, AppointmentStatus>> = {
  [QueueStatus.WAITING]:     AppointmentStatus.IN_QUEUE,
  [QueueStatus.CALLED]:      AppointmentStatus.IN_QUEUE,
  [QueueStatus.IN_PROGRESS]: AppointmentStatus.IN_PROGRESS,
  [QueueStatus.DONE]:        AppointmentStatus.COMPLETED,
  [QueueStatus.SKIPPED]:     AppointmentStatus.NO_SHOW,
};

const ACTIVE_QUEUE_STATUSES: QueueStatus[] = [
  QueueStatus.WAITING,
  QueueStatus.CALLED,
  QueueStatus.IN_PROGRESS,
];

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private timelineWriter: MedicalTimelineWriterService,
    private billingService: BillingService,
  ) {}

  async findAll(query: QueueQueryDto, caller: JwtPayload): Promise<PaginatedResponse<QueueEntryRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const baseWhere = await this.buildWhere(query, caller);
    const where: Prisma.QueueEntryWhereInput = { deletedAt: null, ...baseWhere };

    const [data, total] = await Promise.all([
      this.prisma.queueEntry.findMany({ where, select: SELECT, orderBy: { ticketNumber: 'asc' }, skip, take: limit }),
      this.prisma.queueEntry.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!entry) throw new NotFoundException('Queue entry not found');
    this.assertOwnership(entry.appointment.organizationId, caller);
    return entry;
  }

  private readonly MAX_TICKET_RETRIES = 5;

  async create(dto: CreateQueueEntryDto, caller: JwtPayload) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: dto.appointmentId, deletedAt: null },
      select: { id: true, organizationId: true, status: true, scheduledAt: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appointment.organizationId, caller);

    const ALLOWED: AppointmentStatus[] = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];
    if (!ALLOWED.includes(appointment.status)) {
      const message =
        CHECK_IN_BLOCKED_MESSAGES[appointment.status] ??
        `Cannot check in appointment with status ${appointment.status}`;
      throw new ConflictException(message);
    }

    if (this.toDamascusDateStr(appointment.scheduledAt) !== this.todayDamascus()) {
      throw new BadRequestException(
        'Only appointments scheduled for today can be checked in to the queue.',
      );
    }

    const organizationId = appointment.organizationId;

    for (let attempt = 0; attempt < this.MAX_TICKET_RETRIES; attempt++) {
      try {
        const entry = await this.prisma.$transaction(async (tx) => {
          // Scope MAX to today's business day so ticket numbers reset daily.
          // Do NOT filter by deletedAt — soft-deleted tickets consumed their number.
          const today = this.todayDamascus();
          const max = await tx.queueEntry.findFirst({
            where: { organizationId, businessDate: today },
            orderBy: { ticketNumber: 'desc' },
            select: { ticketNumber: true },
          });
          const ticketNumber = (max?.ticketNumber ?? 0) + 1;

          const created = await tx.queueEntry.create({
            data: {
              appointmentId: dto.appointmentId,
              organizationId,
              businessDate: today,
              ticketNumber,
              status: QueueStatus.WAITING,
            },
            select: SELECT,
          });

          await tx.appointment.update({
            where: { id: dto.appointmentId },
            data: { status: AppointmentStatus.IN_QUEUE },
          });

          return created;
        });

        const patientId = entry.appointment.patient.id;
        await this.timelineWriter.log({
          organizationId,
          patientId,
          eventType: MedicalTimelineEventType.CHECKED_IN,
          createdById: caller.sub,
          metadata: { appointmentId: dto.appointmentId, ticketNumber: entry.ticketNumber },
        });
        await this.timelineWriter.log({
          organizationId,
          patientId,
          eventType: MedicalTimelineEventType.QUEUE_JOINED,
          createdById: caller.sub,
          metadata: { appointmentId: dto.appointmentId, ticketNumber: entry.ticketNumber },
        });

        // Auto-invoice: non-blocking; failure must never prevent check-in.
        await this.billingService.autoCreateInvoiceForAppointment(
          {
            id: dto.appointmentId,
            organizationId,
            branchId: entry.appointment.branchId,
            patientId: entry.appointment.patient.id,
            visitTypeId: entry.appointment.visitTypeId,
            sourceEncounterId: entry.appointment.sourceEncounterId,
          },
          caller.sub,
        ).catch((err) => {
          this.logger.error(`AUTO_INVOICE_FAILED appointmentId=${dto.appointmentId}`, err);
        });

        return entry;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') throw e;

        const target = (e.meta?.target as string[] | string | undefined) ?? [];
        const targetArr = Array.isArray(target) ? target : [target];
        if (targetArr.some((t) => t === 'appointmentId' || t === 'appointment_id')) {
          throw new ConflictException('A queue entry already exists for this appointment');
        }

        // Ticket number collision on auto-generated number — retry.
        if (attempt === this.MAX_TICKET_RETRIES - 1) {
          throw new ConflictException('Ticket number already in use for this organization');
        }
      }
    }

    throw new ConflictException('Could not assign a unique ticket number');
  }

  async update(id: string, dto: UpdateQueueEntryDto, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        appointmentId: true,
        calledAt: true,
        completedAt: true,
        appointment: { select: { organizationId: true, doctorId: true } },
      },
    });

    if (!entry) throw new NotFoundException('Queue entry not found');
    this.assertOwnership(entry.appointment.organizationId, caller);

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!doctorProfile || doctorProfile.id !== entry.appointment.doctorId) {
        throw new ForbiddenException('You can only update queue entries for your own appointments');
      }
    }

    if (caller.role === UserRole.SECRETARY && dto.status !== QueueStatus.CALLED) {
      throw new ForbiddenException('Secretaries may only call the next patient (set status to CALLED)');
    }

    const calledAt =
      dto.status === QueueStatus.CALLED && !entry.calledAt ? new Date() : undefined;
    const completedAt =
      dto.status === QueueStatus.DONE && !entry.completedAt ? new Date() : undefined;

    const appointmentStatus = dto.status ? QUEUE_TO_APPOINTMENT_STATUS[dto.status] : undefined;

    return this.prisma.$transaction(async (tx) => {
      await tx.queueEntry.update({
        where: { id },
        data: {
          status: dto.status,
          ...(calledAt && { calledAt }),
          ...(completedAt && { completedAt }),
        },
      });

      if (appointmentStatus) {
        await tx.appointment.update({
          where: { id: entry.appointmentId },
          data: { status: appointmentStatus },
        });
      }

      return tx.queueEntry.findUniqueOrThrow({
        where: { id },
        select: SELECT,
      });
    });
  }

  async triage(id: string, dto: TriageQueueEntryDto, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, appointment: { select: { organizationId: true } } },
    });

    if (!entry) throw new NotFoundException('Queue entry not found');
    this.assertOwnership(entry.appointment.organizationId, caller);

    return this.prisma.queueEntry.update({
      where: { id },
      data: {
        ...(dto.triageVitals !== undefined && {
          triageVitals: dto.triageVitals as Prisma.InputJsonValue,
        }),
        ...(dto.chiefComplaintDraft !== undefined && {
          chiefComplaintDraft: dto.chiefComplaintDraft,
        }),
      },
      select: SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!entry) throw new NotFoundException('Queue entry not found');
    this.assertOwnership(entry.appointment.organizationId, caller);

    if (ACTIVE_QUEUE_STATUSES.includes(entry.status)) {
      throw new ConflictException(
        'Cannot remove a queue entry while the visit is active. Complete or cancel the visit first.',
      );
    }

    await this.prisma.queueEntry.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: caller.sub },
    });

    await this.auditWriter.log({
      caller,
      action: 'CANCEL',
      resource: 'queue_entry',
      resourceId: id,
      oldData: toSnapshot(entry),
    });
  }

  private async buildWhere(query: QueueQueryDto, caller: JwtPayload): Promise<Prisma.QueueEntryWhereInput> {
    // Default to today when no date supplied — queue board shows today's entries.
    const businessDate = query.date ?? this.todayDamascus();
    const statusFilter = query.status?.length ? { status: { in: query.status } } : {};

    const apptFilters: Prisma.AppointmentWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    if (caller.role === UserRole.SUPER_ADMIN) {
      return {
        ...statusFilter,
        businessDate,
        appointment: {
          ...apptFilters,
          ...(query.organizationId ? { organizationId: query.organizationId } : {}),
          ...(query.doctorId ? { doctorId: query.doctorId } : {}),
        },
      };
    }

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      return {
        ...statusFilter,
        businessDate,
        appointment: {
          ...apptFilters,
          organizationId: caller.organizationId,
          // DOCTOR always scoped to own profile; query.doctorId ignored for security.
          ...(doctorProfile ? { doctorId: doctorProfile.id } : {}),
        },
      };
    }

    return {
      ...statusFilter,
      businessDate,
      appointment: {
        ...apptFilters,
        organizationId: caller.organizationId,
        ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      },
    };
  }

  private todayDamascus(): string {
    // Returns current date as YYYY-MM-DD in Asia/Damascus timezone.
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
  }

  private toDamascusDateStr(date: Date): string {
    // Same convention as todayDamascus(), applied to an arbitrary instant —
    // used to confirm an appointment's scheduledAt falls on today's business day.
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
  }

  private assertOwnership(orgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (orgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this queue entry is not allowed');
    }
  }
}
