import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';

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

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: AppointmentQueryDto, caller: JwtPayload): Promise<PaginatedResponse<AppointmentRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = await this.buildWhere(caller);

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

    await this.validatePatient(dto.patientId, organizationId);
    await this.validateDoctor(dto.doctorId, organizationId);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }

    return this.prisma.appointment.create({
      data: {
        organizationId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin,
        status: dto.status,
        notes: dto.notes,
        cancelReason: dto.cancelReason,
        branchId: dto.branchId,
      },
      select: SELECT,
    });
  }

  async update(id: string, dto: UpdateAppointmentDto, caller: JwtPayload) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true, cancelledAt: true },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appt.organizationId, caller);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, appt.organizationId);
    }

    const cancelledAt =
      dto.status === AppointmentStatus.CANCELLED && !appt.cancelledAt
        ? new Date()
        : undefined;

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        cancelledAt,
      },
      select: SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertOwnership(appt.organizationId, caller);

    await this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async buildWhere(caller: JwtPayload): Promise<Prisma.AppointmentWhereInput> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      return { deletedAt: null };
    }

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (doctorProfile) {
        return { organizationId: caller.organizationId, doctorId: doctorProfile.id, deletedAt: null };
      }
      return { organizationId: caller.organizationId, deletedAt: null };
    }

    return { organizationId: caller.organizationId, deletedAt: null };
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
