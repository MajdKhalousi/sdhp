import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, QueueStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { EncounterQueryDto } from './dto/encounter-query.dto';

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  phone: true,
  gender: true,
  dateOfBirth: true,
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
  appointmentId: true,
  chiefComplaint: true,
  notes: true,
  diagnosis: true,
  diagnosisCode: true,
  treatmentPlan: true,
  followUpDate: true,
  vitals: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: PATIENT_SELECT },
  doctor: { select: DOCTOR_SELECT },
} as const;

type EncounterRecord = Prisma.EncounterGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class EncountersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: EncounterQueryDto, caller: JwtPayload): Promise<PaginatedResponse<EncounterRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = await this.buildWhere(query, caller);

    const [data, total] = await Promise.all([
      this.prisma.encounter.findMany({ where, select: SELECT, orderBy: { startedAt: 'desc' }, skip, take: limit }),
      this.prisma.encounter.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!encounter) throw new NotFoundException('Encounter not found');
    this.assertOwnership(encounter.organizationId, caller);
    return encounter;
  }

  async create(dto: CreateEncounterDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);

    // For DOCTOR caller: enforce their own profile as doctorId.
    const doctorId = await this.resolveDoctorId(dto.doctorId, caller, organizationId);

    await this.validatePatient(dto.patientId, organizationId);
    await this.validateDoctor(doctorId, organizationId);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }

    let appointmentId: string | undefined = dto.appointmentId;
    if (appointmentId) {
      await this.validateAppointment(appointmentId, organizationId);
    }

    try {
      const encounter = await this.prisma.$transaction(async (tx) => {
        const created = await tx.encounter.create({
          data: {
            organizationId,
            patientId: dto.patientId,
            doctorId,
            appointmentId,
            branchId: dto.branchId,
            chiefComplaint: dto.chiefComplaint,
            notes: dto.notes,
            diagnosis: dto.diagnosis,
            diagnosisCode: dto.diagnosisCode,
            treatmentPlan: dto.treatmentPlan,
            followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
            vitals: dto.vitals !== undefined ? (dto.vitals as Prisma.InputJsonValue) : undefined,
            endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
          },
          select: SELECT,
        });

        // Propagate status to appointment + queue.
        // If the encounter is created already closed (endedAt set), jump straight to
        // terminal states — same transition that update() performs on the null→value edge.
        if (appointmentId) {
          const isClosed = !!dto.endedAt;

          await tx.appointment.update({
            where: { id: appointmentId },
            data: {
              status: isClosed
                ? AppointmentStatus.COMPLETED
                : AppointmentStatus.IN_PROGRESS,
            },
          });

          const queueEntry = await tx.queueEntry.findUnique({
            where: { appointmentId },
            select: { id: true },
          });
          if (queueEntry) {
            await tx.queueEntry.update({
              where: { id: queueEntry.id },
              data: isClosed
                ? { status: QueueStatus.DONE, completedAt: new Date() }
                : { status: QueueStatus.IN_PROGRESS },
            });
          }
        }

        return created;
      });

      return encounter;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An encounter already exists for this appointment');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateEncounterDto, caller: JwtPayload) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true, doctorId: true, endedAt: true, appointmentId: true },
    });

    if (!encounter) throw new NotFoundException('Encounter not found');
    this.assertOwnership(encounter.organizationId, caller);

    // DOCTOR can only update their own encounters.
    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!doctorProfile || doctorProfile.id !== encounter.doctorId) {
        throw new ForbiddenException('You can only update your own encounters');
      }
    }

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, encounter.organizationId);
    }

    const updateData = {
      ...dto,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
      vitals: dto.vitals !== undefined ? (dto.vitals as Prisma.InputJsonValue) : undefined,
    };

    // Only propagate on null → value transition; safe no-op if no appointmentId.
    const shouldPropagate = !!dto.endedAt && !encounter.endedAt;
    const appointmentId = encounter.appointmentId;

    if (!shouldPropagate || !appointmentId) {
      return this.prisma.encounter.update({ where: { id }, data: updateData, select: SELECT });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.encounter.update({ where: { id }, data: updateData, select: SELECT });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      const queueEntry = await tx.queueEntry.findUnique({
        where: { appointmentId },
        select: { id: true },
      });
      if (queueEntry) {
        await tx.queueEntry.update({
          where: { id: queueEntry.id },
          data: { status: QueueStatus.DONE, completedAt: new Date() },
        });
      }

      return updated;
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!encounter) throw new NotFoundException('Encounter not found');
    this.assertOwnership(encounter.organizationId, caller);

    await this.prisma.encounter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async buildWhere(query: EncounterQueryDto, caller: JwtPayload): Promise<Prisma.EncounterWhereInput> {
    const dateFilter = query.date ? this.buildDayRange(query.date) : undefined;

    const queryFilters: Prisma.EncounterWhereInput = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(dateFilter ? { startedAt: dateFilter } : {}),
    };

    if (caller.role === UserRole.SUPER_ADMIN) {
      return {
        ...queryFilters,
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
        // DOCTOR always scoped to own profile; query.doctorId ignored for security.
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

  private assertOwnership(encOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (encOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this encounter is not allowed');
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
      throw new ForbiddenException('Cannot create an encounter for another organization');
    }
    return caller.organizationId;
  }

  private async resolveDoctorId(
    dtoDoctorId: string,
    caller: JwtPayload,
    organizationId: string,
  ): Promise<string> {
    if (caller.role !== UserRole.DOCTOR) return dtoDoctorId;

    const doctorProfile = await this.prisma.doctor.findFirst({
      where: { userId: caller.sub, deletedAt: null },
      select: { id: true },
    });
    if (!doctorProfile) {
      throw new BadRequestException('No doctor profile found for your account');
    }
    if (dtoDoctorId !== doctorProfile.id) {
      throw new ForbiddenException('DOCTOR can only create encounters for their own profile');
    }
    return doctorProfile.id;
  }

  private async validatePatient(patientId: string, organizationId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, isActive: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (!patient.isActive) throw new BadRequestException('Patient is inactive');
    if (patient.organizationId !== organizationId) {
      throw new ForbiddenException('Patient does not belong to this organization');
    }
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

  private async validateAppointment(appointmentId: string, organizationId: string): Promise<void> {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, deletedAt: null },
      select: { id: true, organizationId: true, status: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.organizationId !== organizationId) {
      throw new ForbiddenException('Appointment does not belong to this organization');
    }
    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        `Cannot create an encounter for a ${appt.status.replace('_', ' ').toLowerCase()} appointment`,
      );
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
}
