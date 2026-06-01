import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma, ReminderChannel, ReminderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { FollowUpItem, FollowUpStatus } from './followups.types';

// Damascus is permanently UTC+3 (no DST since 2022).
const DAMASCUS_OFFSET_MS = 3 * 60 * 60 * 1000;

function getDamascusDayBoundaries(now: Date): { start: Date; end: Date } {
  const damascusNow = new Date(now.getTime() + DAMASCUS_OFFSET_MS);
  const dateStr = damascusNow.toISOString().slice(0, 10); // YYYY-MM-DD in Damascus
  const start = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - DAMASCUS_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function damascusStartOfDay(dateStr: string): Date {
  return new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - DAMASCUS_OFFSET_MS);
}

function damascusEndOfDay(dateStr: string): Date {
  return new Date(damascusStartOfDay(dateStr).getTime() + 24 * 60 * 60 * 1000);
}

function computeStatus(
  followUpDate: Date,
  activeAppt: { status: AppointmentStatus; scheduledAt: Date } | null,
  todayStart: Date,
  todayEnd: Date,
): FollowUpStatus {
  if (!activeAppt) {
    if (followUpDate >= todayEnd)   return FollowUpStatus.PENDING;
    if (followUpDate >= todayStart) return FollowUpStatus.DUE_TODAY;
    return FollowUpStatus.OVERDUE;
  }

  const { status, scheduledAt } = activeAppt;
  if (status === AppointmentStatus.COMPLETED) return FollowUpStatus.COMPLETED;
  if (status === AppointmentStatus.NO_SHOW)   return FollowUpStatus.MISSED;

  // Active statuses: SCHEDULED, CONFIRMED, CHECKED_IN, IN_QUEUE, IN_PROGRESS
  if (scheduledAt >= todayEnd)   return FollowUpStatus.UPCOMING;
  if (scheduledAt >= todayStart) return FollowUpStatus.DUE_TODAY;
  return FollowUpStatus.OVERDUE; // past active appointment — edge case
}

const ENCOUNTER_SELECT = {
  id: true,
  followUpDate: true,
  startedAt: true,
  patient: {
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  doctor: {
    select: {
      id: true,
      specialization: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  followUpAppointments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      durationMin: true,
      doctor: {
        select: {
          id: true,
          specialization: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  },
} as const;

type EncounterRow = Prisma.EncounterGetPayload<{ select: typeof ENCOUNTER_SELECT }>;
type ApptRow = EncounterRow['followUpAppointments'][number];

@Injectable()
export class FollowupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query: FollowUpQueryDto,
    caller: JwtPayload,
  ): Promise<PaginatedResponse<FollowUpItem>> {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getDamascusDayBoundaries(now);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // DOCTOR role: always scope to their own profile; query.doctorId is ignored for security.
    let doctorId: string | undefined = query.doctorId;
    if (caller.role === UserRole.DOCTOR) {
      const profile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!profile) return { data: [], total: 0, page, limit };
      doctorId = profile.id;
    }

    const followUpDateFilter: Prisma.DateTimeNullableFilter<'Encounter'> = { not: null };
    if (query.dateFrom) followUpDateFilter.gte = damascusStartOfDay(query.dateFrom);
    if (query.dateTo)   followUpDateFilter.lte = damascusEndOfDay(query.dateTo);

    const where: Prisma.EncounterWhereInput = {
      organizationId: caller.organizationId,
      deletedAt: null,
      followUpDate: followUpDateFilter,
      ...(doctorId        ? { doctorId }              : {}),
      ...(query.branchId  ? { branchId: query.branchId } : {}),
    };

    const rows = await this.prisma.encounter.findMany({
      where,
      select: ENCOUNTER_SELECT,
      orderBy: { followUpDate: 'asc' },
    });

    const allItems = rows.map((e) => this.toItem(e, todayStart, todayEnd));

    const filtered = query.status?.length
      ? allItems.filter((i) => query.status!.includes(i.followUpStatus))
      : allItems;

    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  async createReminder(
    encounterId: string,
    dto: CreateReminderDto,
    caller: JwtPayload,
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId: caller.organizationId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        patientId: true,
        followUpDate: true,
        followUpAppointments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' as const },
          select: { id: true, status: true },
          take: 1,
        },
      },
    });

    if (!encounter) throw new NotFoundException('Encounter not found');
    if (!encounter.followUpDate) throw new BadRequestException('Encounter has no follow-up date');

    const channel = dto.channel ?? ReminderChannel.IN_APP;

    const existing = await this.prisma.followUpReminder.findFirst({
      where: { encounterId, channel, status: ReminderStatus.PENDING },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Pending reminder already exists for this follow-up');
    }

    const activeAppt = encounter.followUpAppointments.find(
      (a) => a.status !== AppointmentStatus.CANCELLED,
    );

    return this.prisma.followUpReminder.create({
      data: {
        organizationId: encounter.organizationId,
        patientId: encounter.patientId,
        encounterId,
        appointmentId: activeAppt?.id ?? null,
        channel,
        scheduledFor: encounter.followUpDate,
        status: ReminderStatus.PENDING,
      },
      select: {
        id: true,
        organizationId: true,
        patientId: true,
        encounterId: true,
        appointmentId: true,
        channel: true,
        scheduledFor: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private toItem(e: EncounterRow, todayStart: Date, todayEnd: Date): FollowUpItem {
    const followUpDate = e.followUpDate!; // guaranteed non-null by WHERE clause

    // First non-cancelled appointment is the active follow-up (newest first)
    const activeAppt: ApptRow | null =
      e.followUpAppointments.find((a) => a.status !== AppointmentStatus.CANCELLED) ?? null;

    const followUpStatus = computeStatus(followUpDate, activeAppt, todayStart, todayEnd);

    // Positive daysDelta = patient booked late; negative = booked early; null = not booked
    const daysDelta = activeAppt
      ? Math.round((activeAppt.scheduledAt.getTime() - followUpDate.getTime()) / 86_400_000)
      : null;

    return {
      encounterId: e.id,
      followUpDate: followUpDate.toISOString(),
      encounterDate: e.startedAt.toISOString(),
      followUpStatus,
      daysDelta,
      patient: {
        id: e.patient.id,
        mrn: e.patient.mrn,
        firstName: e.patient.firstName,
        lastName: e.patient.lastName,
        phone: e.patient.phone ?? null,
      },
      doctor: {
        id: e.doctor.id,
        firstName: e.doctor.user.firstName,
        lastName: e.doctor.user.lastName,
        specialization: e.doctor.specialization,
      },
      linkedAppointment: activeAppt
        ? {
            id: activeAppt.id,
            status: activeAppt.status,
            scheduledAt: activeAppt.scheduledAt.toISOString(),
            durationMin: activeAppt.durationMin,
            doctor: {
              id: activeAppt.doctor.id,
              firstName: activeAppt.doctor.user.firstName,
              lastName: activeAppt.doctor.user.lastName,
              specialization: activeAppt.doctor.specialization,
            },
          }
        : null,
    };
  }
}
