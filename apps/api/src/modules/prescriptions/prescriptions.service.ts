import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

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

const ENCOUNTER_SELECT = {
  id: true,
  organizationId: true,
  patientId: true,
  doctorId: true,
  appointmentId: true,
  startedAt: true,
  patient: { select: PATIENT_SELECT },
  doctor: { select: DOCTOR_SELECT },
} as const;

const SELECT = {
  id: true,
  encounterId: true,
  medication: true,
  dosage: true,
  frequency: true,
  duration: true,
  instructions: true,
  quantity: true,
  refillsLeft: true,
  createdAt: true,
  updatedAt: true,
  encounter: { select: ENCOUNTER_SELECT },
} as const;

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(caller: JwtPayload) {
    if (caller.role === UserRole.SUPER_ADMIN) {
      return this.prisma.prescription.findMany({
        where: { deletedAt: null },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      const encounterWhere = doctorProfile
        ? { organizationId: caller.organizationId, doctorId: doctorProfile.id, deletedAt: null }
        : { organizationId: caller.organizationId, deletedAt: null };
      return this.prisma.prescription.findMany({
        where: { deletedAt: null, encounter: encounterWhere },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.prescription.findMany({
      where: {
        deletedAt: null,
        encounter: { organizationId: caller.organizationId, deletedAt: null },
      },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    this.assertOwnership(prescription.encounter.organizationId, caller);
    return prescription;
  }

  async create(dto: CreatePrescriptionDto, caller: JwtPayload) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, deletedAt: null },
      select: { id: true, organizationId: true, doctorId: true },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    this.assertOwnership(encounter.organizationId, caller);

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!doctorProfile) {
        throw new BadRequestException('No doctor profile found for your account');
      }
      if (encounter.doctorId !== doctorProfile.id) {
        throw new ForbiddenException('DOCTOR can only create prescriptions for their own encounters');
      }
    }

    return this.prisma.prescription.create({
      data: {
        encounterId: dto.encounterId,
        medication: dto.medication,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        instructions: dto.instructions,
        quantity: dto.quantity,
        refillsLeft: dto.refillsLeft,
      },
      select: SELECT,
    });
  }

  async update(id: string, dto: UpdatePrescriptionDto, caller: JwtPayload) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, encounter: { select: { organizationId: true, doctorId: true } } },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    this.assertOwnership(prescription.encounter.organizationId, caller);

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!doctorProfile || doctorProfile.id !== prescription.encounter.doctorId) {
        throw new ForbiddenException('You can only update prescriptions from your own encounters');
      }
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { ...dto },
      select: SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, encounter: { select: { organizationId: true } } },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    this.assertOwnership(prescription.encounter.organizationId, caller);

    await this.prisma.prescription.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertOwnership(encOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (encOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this prescription is not allowed');
    }
  }
}
