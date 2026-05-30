import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, ScheduleExceptionType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UpsertDoctorScheduleDto } from './dto/upsert-doctor-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';

const SCHEDULE_SELECT = {
  id: true,
  doctorId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  isActive: true,
  updatedAt: true,
} as const;

const EXCEPTION_SELECT = {
  id: true,
  doctorId: true,
  date: true,
  type: true,
  startTime: true,
  endTime: true,
  reason: true,
  createdAt: true,
} as const;

// Damascus is UTC+3, no DST (Syria abolished DST in 2022).
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function damascusComponents(utcDate: Date): {
  dayOfWeek: number;
  dateStr: string;
  minuteOfDay: number;
} {
  const damascusMs = utcDate.getTime() + TZ_OFFSET_MS;
  const dt = new Date(damascusMs);
  return {
    dayOfWeek: dt.getUTCDay(),
    dateStr: dt.toISOString().slice(0, 10),
    minuteOfDay: dt.getUTCHours() * 60 + dt.getUTCMinutes(),
  };
}

@Injectable()
export class DoctorSchedulesService {
  constructor(private prisma: PrismaService) {}

  // ── Weekly schedule ────────────────────────────────────────────────────────

  async getSchedule(doctorId: string, caller: JwtPayload) {
    await this.resolveDoctor(doctorId, caller);
    return this.prisma.doctorSchedule.findMany({
      where: { doctorId },
      select: SCHEDULE_SELECT,
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertSchedule(doctorId: string, dto: UpsertDoctorScheduleDto, caller: JwtPayload) {
    await this.resolveDoctor(doctorId, caller);

    const days = dto.days.map(d => d.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('Duplicate dayOfWeek entries in schedule');
    }

    await this.prisma.$transaction([
      this.prisma.doctorSchedule.deleteMany({ where: { doctorId } }),
      this.prisma.doctorSchedule.createMany({
        data: dto.days.map(d => ({
          doctorId,
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          isActive: d.isActive ?? true,
        })),
      }),
    ]);

    return this.prisma.doctorSchedule.findMany({
      where: { doctorId },
      select: SCHEDULE_SELECT,
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // ── Schedule exceptions ────────────────────────────────────────────────────

  async listExceptions(doctorId: string, caller: JwtPayload) {
    await this.resolveDoctor(doctorId, caller);
    return this.prisma.doctorScheduleException.findMany({
      where: { doctorId },
      select: EXCEPTION_SELECT,
      orderBy: { date: 'asc' },
    });
  }

  async createException(
    doctorId: string,
    dto: CreateScheduleExceptionDto,
    caller: JwtPayload,
  ) {
    await this.resolveDoctor(doctorId, caller);
    const exceptionDate = new Date(`${dto.date}T00:00:00.000Z`);

    const existing = await this.prisma.doctorScheduleException.findFirst({
      where: { doctorId, date: exceptionDate },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`An exception already exists for ${dto.date}`);
    }

    return this.prisma.doctorScheduleException.create({
      data: {
        doctorId,
        date: exceptionDate,
        type: dto.type,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        reason: dto.reason ?? null,
      },
      select: EXCEPTION_SELECT,
    });
  }

  async updateException(
    doctorId: string,
    exceptionId: string,
    dto: UpdateScheduleExceptionDto,
    caller: JwtPayload,
  ) {
    await this.resolveDoctor(doctorId, caller);
    const exc = await this.prisma.doctorScheduleException.findFirst({
      where: { id: exceptionId, doctorId },
      select: { id: true },
    });
    if (!exc) throw new NotFoundException('Schedule exception not found');

    return this.prisma.doctorScheduleException.update({
      where: { id: exceptionId },
      data: {
        type: dto.type,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
      select: EXCEPTION_SELECT,
    });
  }

  async deleteException(doctorId: string, exceptionId: string, caller: JwtPayload) {
    await this.resolveDoctor(doctorId, caller);
    const exc = await this.prisma.doctorScheduleException.findFirst({
      where: { id: exceptionId, doctorId },
      select: { id: true },
    });
    if (!exc) throw new NotFoundException('Schedule exception not found');

    await this.prisma.doctorScheduleException.delete({ where: { id: exceptionId } });
  }

  // ── Available slots ────────────────────────────────────────────────────────

  async getAvailableSlots(
    doctorId: string,
    query: AvailableSlotsQueryDto,
    caller: JwtPayload,
  ) {
    const { organizationId } = await this.resolveDoctor(doctorId, caller);
    const { date } = query;

    const requestDate = new Date(`${date}T00:00:00.000Z`);
    const requestDayOfWeek = new Date(requestDate.getTime() + TZ_OFFSET_MS).getUTCDay();

    const [clinicSettings, exception, doctorSchedules] = await Promise.all([
      this.prisma.clinicSettings.findUnique({
        where: { organizationId },
        select: {
          defaultSlotMin: true,
          lunchStartTime: true,
          lunchEndTime: true,
          workingDays: {
            select: { dayOfWeek: true, startTime: true, endTime: true, isOpen: true },
          },
        },
      }),
      this.prisma.doctorScheduleException.findFirst({
        where: { doctorId, date: requestDate },
        select: { type: true, startTime: true, endTime: true },
      }),
      this.prisma.doctorSchedule.findMany({
        where: { doctorId, isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      }),
    ]);

    const slotDurationMin = query.slotDurationMin ?? clinicSettings?.defaultSlotMin ?? 20;

    // Clinic closed?
    const clinicDay = clinicSettings?.workingDays.find(d => d.dayOfWeek === requestDayOfWeek);
    if (clinicDay && !clinicDay.isOpen) {
      return { date, slotDurationMin, slots: [] };
    }

    // Full-day exception (holiday / all-day leave)?
    if (
      exception?.type === ScheduleExceptionType.HOLIDAY ||
      (exception?.type === ScheduleExceptionType.LEAVE && !exception.startTime)
    ) {
      return { date, slotDurationMin, slots: [] };
    }

    // Determine working window
    let workStartMin: number;
    let workEndMin: number;

    if (
      (exception?.type === ScheduleExceptionType.CUSTOM_HOURS ||
        exception?.type === ScheduleExceptionType.LEAVE) &&
      exception.startTime &&
      exception.endTime
    ) {
      workStartMin = toMinutes(exception.startTime);
      workEndMin = toMinutes(exception.endTime);
    } else if (doctorSchedules.length > 0) {
      const daySchedule = doctorSchedules.find(s => s.dayOfWeek === requestDayOfWeek);
      if (!daySchedule) return { date, slotDurationMin, slots: [] };
      workStartMin = toMinutes(daySchedule.startTime);
      workEndMin = toMinutes(daySchedule.endTime);
    } else if (clinicDay) {
      workStartMin = toMinutes(clinicDay.startTime);
      workEndMin = toMinutes(clinicDay.endTime);
    } else {
      workStartMin = 480;  // 08:00 fallback
      workEndMin = 1020;   // 17:00 fallback
    }

    const lunchStartMin =
      clinicSettings?.lunchStartTime ? toMinutes(clinicSettings.lunchStartTime) : null;
    const lunchEndMin =
      clinicSettings?.lunchEndTime ? toMinutes(clinicSettings.lunchEndTime) : null;

    // Fetch existing appointments for the day (Damascus day boundaries in UTC)
    const dayStart = new Date(requestDate.getTime() - TZ_OFFSET_MS);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const existingAppts = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        deletedAt: null,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        scheduledAt: { gte: dayStart, lt: dayEnd },
      },
      select: { scheduledAt: true, durationMin: true },
    });

    const bookedIntervals = existingAppts.map(appt => {
      const { minuteOfDay } = damascusComponents(appt.scheduledAt);
      return { start: minuteOfDay, end: minuteOfDay + (appt.durationMin ?? 20) };
    });

    // Generate slots
    const slots: { time: string; available: boolean }[] = [];
    for (
      let slotStart = workStartMin;
      slotStart + slotDurationMin <= workEndMin;
      slotStart += slotDurationMin
    ) {
      const slotEnd = slotStart + slotDurationMin;

      // Skip lunch-overlap slots
      if (lunchStartMin !== null && lunchEndMin !== null) {
        if (slotStart < lunchEndMin && slotEnd > lunchStartMin) continue;
      }

      const isAvailable = bookedIntervals.every(b => slotStart >= b.end || slotEnd <= b.start);
      slots.push({ time: toHHMM(slotStart), available: isAvailable });
    }

    return {
      date,
      slotDurationMin,
      workingHours: { start: toHHMM(workStartMin), end: toHHMM(workEndMin) },
      slots,
    };
  }

  // ── Availability assertion (called by AppointmentsService on create/reschedule) ──

  async assertDoctorAvailability(
    doctorId: string,
    scheduledAt: Date,
    durationMin: number,
    organizationId: string,
    excludeId?: string,
  ): Promise<void> {
    const { dayOfWeek, dateStr, minuteOfDay: apptStartMin } = damascusComponents(scheduledAt);
    const apptEndMin = apptStartMin + durationMin;
    const exceptionDate = new Date(`${dateStr}T00:00:00.000Z`);

    const [doctor, clinicSettings, exception] = await Promise.all([
      this.prisma.doctor.findFirst({
        where: { id: doctorId, deletedAt: null },
        select: {
          maxPatientsPerDay: true,
          schedules: {
            where: { isActive: true },
            select: { dayOfWeek: true, startTime: true, endTime: true },
          },
        },
      }),
      this.prisma.clinicSettings.findUnique({
        where: { organizationId },
        select: {
          lunchStartTime: true,
          lunchEndTime: true,
          workingDays: { select: { dayOfWeek: true, isOpen: true } },
        },
      }),
      this.prisma.doctorScheduleException.findFirst({
        where: { doctorId, date: exceptionDate },
        select: { type: true, startTime: true, endTime: true, reason: true },
      }),
    ]);

    // 1. Clinic working day
    if (clinicSettings) {
      const clinicDay = clinicSettings.workingDays.find(d => d.dayOfWeek === dayOfWeek);
      if (clinicDay && !clinicDay.isOpen) {
        throw new BadRequestException('Clinic is closed on this day');
      }
    }

    // 2. Full-day block exception
    if (exception) {
      if (
        exception.type === ScheduleExceptionType.HOLIDAY ||
        (exception.type === ScheduleExceptionType.LEAVE && !exception.startTime)
      ) {
        const reason = exception.reason ? ` (${exception.reason})` : '';
        throw new BadRequestException(`Doctor is not available on this date${reason}`);
      }
    }

    // 3. Determine working window
    let workStartMin: number | null = null;
    let workEndMin: number | null = null;

    if (
      (exception?.type === ScheduleExceptionType.CUSTOM_HOURS ||
        exception?.type === ScheduleExceptionType.LEAVE) &&
      exception.startTime &&
      exception.endTime
    ) {
      workStartMin = toMinutes(exception.startTime);
      workEndMin = toMinutes(exception.endTime);
    } else {
      const schedules = doctor?.schedules ?? [];
      if (schedules.length > 0) {
        const daySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);
        if (!daySchedule) {
          throw new BadRequestException('Doctor does not work on this day of the week');
        }
        workStartMin = toMinutes(daySchedule.startTime);
        workEndMin = toMinutes(daySchedule.endTime);
      }
      // No schedule records → unrestricted (backward-compatible)
    }

    // 4. Time within working window
    if (workStartMin !== null && workEndMin !== null) {
      if (apptStartMin < workStartMin || apptEndMin > workEndMin) {
        throw new BadRequestException(
          `Appointment time is outside the doctor's working hours (${toHHMM(workStartMin)}–${toHHMM(workEndMin)})`,
        );
      }
    }

    // 5. Lunch break overlap
    if (clinicSettings?.lunchStartTime && clinicSettings?.lunchEndTime) {
      const lunchStart = toMinutes(clinicSettings.lunchStartTime);
      const lunchEnd = toMinutes(clinicSettings.lunchEndTime);
      if (apptStartMin < lunchEnd && apptEndMin > lunchStart) {
        throw new BadRequestException(
          `Appointment overlaps with lunch break (${clinicSettings.lunchStartTime}–${clinicSettings.lunchEndTime})`,
        );
      }
    }

    // 6. maxPatientsPerDay
    if (doctor?.maxPatientsPerDay) {
      const dayStart = new Date(
        new Date(`${dateStr}T00:00:00.000Z`).getTime() - TZ_OFFSET_MS,
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await this.prisma.appointment.count({
        where: {
          doctorId,
          deletedAt: null,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
          scheduledAt: { gte: dayStart, lt: dayEnd },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (count >= doctor.maxPatientsPerDay) {
        throw new BadRequestException(
          `Doctor has reached the maximum number of appointments for this day (${doctor.maxPatientsPerDay})`,
        );
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveDoctor(
    doctorId: string,
    caller: JwtPayload,
  ): Promise<{ id: string; organizationId: string }> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, deletedAt: null },
      select: { id: true, user: { select: { organizationId: true } } },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const orgId = doctor.user.organizationId;
    if (caller.role !== UserRole.SUPER_ADMIN && orgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this doctor is not allowed');
    }
    return { id: doctor.id, organizationId: orgId };
  }
}
