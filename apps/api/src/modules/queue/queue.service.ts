import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, QueueStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { UpdateQueueEntryDto } from './dto/update-queue-entry.dto';
import { QueueQueryDto } from './dto/queue-query.dto';

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
  patient: { select: PATIENT_SELECT },
  doctor: { select: DOCTOR_SELECT },
} as const;

const SELECT = {
  id: true,
  appointmentId: true,
  ticketNumber: true,
  status: true,
  calledAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  appointment: { select: APPOINTMENT_SELECT },
} as const;

type QueueEntryRecord = Prisma.QueueEntryGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueueQueryDto, caller: JwtPayload): Promise<PaginatedResponse<QueueEntryRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = await this.buildWhere(query, caller);

    const [data, total] = await Promise.all([
      this.prisma.queueEntry.findMany({ where, select: SELECT, orderBy: { ticketNumber: 'asc' }, skip, take: limit }),
      this.prisma.queueEntry.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id },
      select: SELECT,
    });

    if (!entry) throw new NotFoundException('Queue entry not found');
    this.assertOwnership(entry.appointment.organizationId, caller);
    return entry;
  }

  async create(dto: CreateQueueEntryDto, caller: JwtPayload) {
    // Validate appointment and derive organization.
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: dto.appointmentId, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appointment.organizationId, caller);

    const organizationId = appointment.organizationId;

    // Auto-generate ticket number if not provided.
    const ticketNumber = dto.ticketNumber ?? (await this.nextTicketNumber(organizationId));

    // Create queue entry and update appointment status in one transaction.
    try {
      const [entry] = await this.prisma.$transaction([
        this.prisma.queueEntry.create({
          data: {
            appointmentId: dto.appointmentId,
            ticketNumber,
            status: dto.status,
          },
          select: SELECT,
        }),
        this.prisma.appointment.update({
          where: { id: dto.appointmentId },
          data: { status: AppointmentStatus.CHECKED_IN },
        }),
      ]);
      return entry;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A queue entry already exists for this appointment');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateQueueEntryDto, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id },
      select: { id: true, calledAt: true, completedAt: true, appointment: { select: { organizationId: true, doctorId: true } } },
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

    const calledAt =
      dto.status === QueueStatus.CALLED && !entry.calledAt ? new Date() : undefined;
    const completedAt =
      dto.status === QueueStatus.DONE && !entry.completedAt ? new Date() : undefined;

    return this.prisma.queueEntry.update({
      where: { id },
      data: {
        status: dto.status,
        ...(calledAt && { calledAt }),
        ...(completedAt && { completedAt }),
      },
      select: SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id },
      select: { id: true, appointment: { select: { organizationId: true } } },
    });

    if (!entry) throw new NotFoundException('Queue entry not found');
    this.assertOwnership(entry.appointment.organizationId, caller);

    // QueueEntry has no deletedAt — hard delete.
    await this.prisma.queueEntry.delete({ where: { id } });
  }

  private async buildWhere(query: QueueQueryDto, caller: JwtPayload): Promise<Prisma.QueueEntryWhereInput> {
    const dateFilter = query.date ? this.buildDayRange(query.date) : undefined;
    const statusFilter = query.status?.length ? { status: { in: query.status } } : {};

    const apptQueryFilters: Prisma.AppointmentWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(dateFilter ? { scheduledAt: dateFilter } : {}),
    };

    if (caller.role === UserRole.SUPER_ADMIN) {
      return {
        ...statusFilter,
        appointment: {
          ...apptQueryFilters,
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
        appointment: {
          ...apptQueryFilters,
          organizationId: caller.organizationId,
          // DOCTOR always scoped to own profile; query.doctorId ignored for security.
          ...(doctorProfile ? { doctorId: doctorProfile.id } : {}),
        },
      };
    }

    return {
      ...statusFilter,
      appointment: {
        ...apptQueryFilters,
        organizationId: caller.organizationId,
        ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      },
    };
  }

  private buildDayRange(date: string): { gte: Date; lt: Date } {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }

  private assertOwnership(orgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (orgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this queue entry is not allowed');
    }
  }

  private async nextTicketNumber(organizationId: string): Promise<number> {
    const max = await this.prisma.queueEntry.findFirst({
      where: { appointment: { organizationId } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    return (max?.ticketNumber ?? 0) + 1;
  }
}
