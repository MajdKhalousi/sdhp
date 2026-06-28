import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceExecutionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { CreateMedicalServiceRequestDto } from './dto/create-medical-service-request.dto';
import { MedicalServiceRequestQueryDto } from './dto/medical-service-request-query.dto';
import { CancelMedicalServiceRequestDto } from './dto/cancel-medical-service-request.dto';

const SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  patientId: true,
  serviceId: true,
  appointmentId: true,
  encounterId: true,
  invoiceItemId: true,
  requestedById: true,
  doctorId: true,
  requestedServiceName: true,
  requestedUnitPrice: true,
  quantity: true,
  notes: true,
  executionStatus: true,
  executedAt: true,
  executedById: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  service: { select: { id: true, name: true, nameAr: true, code: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  doctor: {
    select: { id: true, specialization: true, user: { select: { id: true, firstName: true, lastName: true } } },
  },
} as const;

@Injectable()
export class MedicalServiceRequestsService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async create(dto: CreateMedicalServiceRequestDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, dto.patientId, caller);

    const orgId = await this.resolveCreateOrgId(dto, patient.organizationId, caller);

    if (dto.branchId) await this.assertBranchBelongsToOrg(dto.branchId, orgId);
    if (dto.appointmentId) {
      await this.assertAppointmentBelongsToOrgAndPatient(dto.appointmentId, orgId, dto.patientId);
    }
    if (dto.encounterId) {
      await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);
    }
    if (dto.doctorId) await this.assertDoctorBelongsToOrg(dto.doctorId, orgId);

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, organizationId: orgId, deletedAt: null, isActive: true },
      select: { id: true, name: true, defaultPrice: true },
    });
    if (!service) throw new BadRequestException('Service not found or not active in this organization');

    const result = await this.prisma.medicalServiceRequest.create({
      data: {
        organizationId: orgId,
        branchId: dto.branchId,
        patientId: dto.patientId,
        serviceId: service.id,
        appointmentId: dto.appointmentId,
        encounterId: dto.encounterId,
        doctorId: dto.doctorId,
        requestedById: caller.sub,
        requestedServiceName: service.name,
        requestedUnitPrice: service.defaultPrice,
        quantity: dto.quantity ?? 1,
        notes: dto.notes,
      },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'MEDICAL_SERVICE_REQUEST_CREATED',
      resource: 'medicalServiceRequest',
      resourceId: result.id,
      newData: toSnapshot({
        patientId: result.patientId,
        serviceId: result.serviceId,
        requestedServiceName: result.requestedServiceName,
        requestedUnitPrice: result.requestedUnitPrice.toString(),
        quantity: result.quantity,
        executionStatus: result.executionStatus,
      }),
    });

    return result;
  }

  async findAll(
    query: MedicalServiceRequestQueryDto,
    caller: JwtPayload,
  ): Promise<PaginatedResponse<unknown>> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: query.patientId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, query.patientId, caller);

    const organizationId = caller.role !== UserRole.SUPER_ADMIN ? caller.organizationId : undefined;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      patientId: query.patientId,
      ...(organizationId ? { organizationId } : {}),
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.medicalServiceRequest.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.medicalServiceRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    return this.resolveScoped(id, caller);
  }

  async execute(id: string, caller: JwtPayload) {
    const request = await this.resolveScoped(id, caller);
    this.assertTransitionable(request.executionStatus, 'executed');

    const result = await this.prisma.medicalServiceRequest.update({
      where: { id },
      data: {
        executionStatus: ServiceExecutionStatus.COMPLETED,
        executedAt: new Date(),
        executedById: caller.sub,
      },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'MEDICAL_SERVICE_REQUEST_EXECUTED',
      resource: 'medicalServiceRequest',
      resourceId: id,
      oldData: toSnapshot({ executionStatus: request.executionStatus }),
      newData: toSnapshot({
        executionStatus: result.executionStatus,
        executedAt: result.executedAt,
        executedById: result.executedById,
      }),
    });

    return result;
  }

  async cancel(id: string, dto: CancelMedicalServiceRequestDto, caller: JwtPayload) {
    const request = await this.resolveScoped(id, caller);
    this.assertTransitionable(request.executionStatus, 'cancelled');

    const cancelReason = dto.cancelReason.trim();
    if (!cancelReason) throw new BadRequestException('cancelReason must not be empty');

    const result = await this.prisma.medicalServiceRequest.update({
      where: { id },
      data: {
        executionStatus: ServiceExecutionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason,
      },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'MEDICAL_SERVICE_REQUEST_CANCELLED',
      resource: 'medicalServiceRequest',
      resourceId: id,
      oldData: toSnapshot({ executionStatus: request.executionStatus }),
      newData: toSnapshot({
        executionStatus: result.executionStatus,
        cancelledAt: result.cancelledAt,
        cancelReason: result.cancelReason,
      }),
    });

    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveScoped(id: string, caller: JwtPayload) {
    const request = await this.prisma.medicalServiceRequest.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });
    if (!request) throw new NotFoundException('Medical service request not found');

    if (caller.role !== UserRole.SUPER_ADMIN && request.organizationId !== caller.organizationId) {
      throw new NotFoundException('Medical service request not found');
    }
    await assertPatientLinkedToOrg(this.prisma, request.patientId, caller);

    return request;
  }

  private assertTransitionable(
    current: ServiceExecutionStatus,
    targetVerb: 'executed' | 'cancelled',
  ): void {
    if (current !== ServiceExecutionStatus.REQUESTED && current !== ServiceExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Only REQUESTED or IN_PROGRESS requests can be ${targetVerb} (current status: ${current})`,
      );
    }
  }

  private async resolveCreateOrgId(
    dto: CreateMedicalServiceRequestDto,
    patientOrgId: string,
    caller: JwtPayload,
  ): Promise<string> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      return dto.organizationId ?? patientOrgId;
    }
    if (dto.organizationId && dto.organizationId !== caller.organizationId) {
      throw new BadRequestException('Cannot create a medical service request for another organization');
    }
    if (patientOrgId !== caller.organizationId) {
      throw new NotFoundException('Patient not found');
    }
    return caller.organizationId;
  }

  private async assertBranchBelongsToOrg(branchId: string, orgId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Branch does not belong to this organization');
  }

  private async assertAppointmentBelongsToOrgAndPatient(
    appointmentId: string,
    orgId: string,
    patientId: string,
  ): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId: orgId, patientId, deletedAt: null },
      select: { id: true },
    });
    if (!appointment) {
      throw new BadRequestException('Appointment does not belong to this organization and patient');
    }
  }

  private async assertEncounterBelongsToOrgAndPatient(
    encounterId: string,
    orgId: string,
    patientId: string,
  ): Promise<void> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId: orgId, patientId, deletedAt: null },
      select: { id: true },
    });
    if (!encounter) {
      throw new BadRequestException('Encounter does not belong to this organization and patient');
    }
  }

  private async assertDoctorBelongsToOrg(doctorId: string, orgId: string): Promise<void> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, deletedAt: null, user: { organizationId: orgId } },
      select: { id: true },
    });
    if (!doctor) throw new BadRequestException('Doctor does not belong to this organization');
  }
}
