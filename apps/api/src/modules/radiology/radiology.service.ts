import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MedicalTimelineEventType, RadiologyOrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';
import { CreateRadiologyOrderDto } from './dto/create-radiology-order.dto';
import { UpdateRadiologyOrderStatusDto } from './dto/update-radiology-order-status.dto';
import { UpsertRadiologyReportDto } from './dto/upsert-radiology-report.dto';
import { RadiologyQueryDto } from './dto/radiology-query.dto';
import { AuditLogsWriterService } from '../audit-logs/audit-logs-writer.service';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';

// ── Select constants ───────────────────────────────────────────────────────

const DOCTOR_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
} as const;

const DOCTOR_SELECT = {
  id: true,
  specialization: true,
  isActive: true,
  user: { select: DOCTOR_USER_SELECT },
} as const;

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  organizationId: true,
  isActive: true,
} as const;

const REPORT_SELECT = {
  id: true,
  radiologyOrderId: true,
  findings: true,
  impression: true,
  reportedById: true,
  reportedAt: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reportedBy: { select: DOCTOR_SELECT },
  reviewedBy: { select: DOCTOR_SELECT },
} as const;

const ORDER_SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  patientId: true,
  encounterId: true,
  orderedById: true,
  modality: true,
  bodyPart: true,
  clinicalInfo: true,
  status: true,
  priority: true,
  notes: true,
  scheduledAt: true,
  cancelReason: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: PATIENT_SELECT },
  orderedBy: { select: DOCTOR_SELECT },
  report: { select: REPORT_SELECT },
} as const;

// ── Valid status transitions for /status endpoint ──────────────────────────
// RESULTED is only reachable via /report; REVIEWED only via /review.

const VALID_TRANSITIONS: Partial<Record<RadiologyOrderStatus, RadiologyOrderStatus[]>> = {
  [RadiologyOrderStatus.ORDERED]: [RadiologyOrderStatus.SCHEDULED, RadiologyOrderStatus.CANCELLED],
  [RadiologyOrderStatus.SCHEDULED]: [RadiologyOrderStatus.IN_PROGRESS, RadiologyOrderStatus.CANCELLED],
  [RadiologyOrderStatus.IN_PROGRESS]: [RadiologyOrderStatus.CANCELLED],
  [RadiologyOrderStatus.RESULTED]: [RadiologyOrderStatus.CANCELLED],
};

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class RadiologyService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private timelineWriter: MedicalTimelineWriterService,
  ) {}

  async create(dto: CreateRadiologyOrderDto, caller: JwtPayload) {
    const orgId = await this.resolveCreateOrgId(dto, caller);

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, dto.patientId, caller);

    if (dto.branchId) await this.assertBranchBelongsToOrg(dto.branchId, orgId);
    if (dto.encounterId) {
      await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);
    }

    // DOCTOR: orderedById auto-resolved from caller profile.
    // Non-DOCTOR + encounterId: derive from encounter.doctorId (encounter workspace flow).
    // Non-DOCTOR + no encounterId: required from request body (direct API usage).
    let orderedById: string;
    if (caller.role === UserRole.DOCTOR) {
      const doctor = await this.resolveCallerDoctor(caller);
      orderedById = doctor.id;
    } else if (dto.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: { id: dto.encounterId, deletedAt: null },
        select: { doctorId: true },
      });
      if (!enc) throw new BadRequestException('Encounter not found');
      await this.assertDoctorBelongsToOrg(enc.doctorId, orgId);
      orderedById = enc.doctorId;
    } else {
      if (!dto.orderedById) throw new BadRequestException('orderedById is required');
      await this.assertDoctorBelongsToOrg(dto.orderedById, orgId);
      orderedById = dto.orderedById;
    }

    const result = await this.prisma.radiologyOrder.create({
      data: {
        organizationId: orgId,
        branchId: dto.branchId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        orderedById,
        modality: dto.modality,
        bodyPart: dto.bodyPart,
        clinicalInfo: dto.clinicalInfo,
        priority: dto.priority,
        notes: dto.notes,
      },
      select: ORDER_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'CREATE', resource: 'radiology_order', resourceId: result.id });
    await this.timelineWriter.log({
      organizationId: result.organizationId,
      patientId: result.patientId,
      eventType: MedicalTimelineEventType.RADIOLOGY_ORDERED,
      createdById: caller.sub,
      metadata: {
        radiologyOrderId: result.id,
        modality: result.modality,
        bodyPart: result.bodyPart ?? null,
        encounterId: result.encounterId ?? null,
      },
    });
    return result;
  }

  async findAll(query: RadiologyQueryDto, caller: JwtPayload) {
    const orgId = this.resolveReadOrgId(query, caller);

    if (query.branchId && orgId) {
      await this.assertBranchBelongsToOrg(query.branchId, orgId);
    }

    return this.prisma.radiologyOrder.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.status ? { status: query.status } : {}),
        deletedAt: null,
        ...this.createdAtFilter(query.from, query.to),
      },
      select: ORDER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);
    return order;
  }

  async updateStatus(id: string, dto: UpdateRadiologyOrderStatusDto, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    const { status: newStatus } = dto;

    if (newStatus === RadiologyOrderStatus.RESULTED) {
      throw new BadRequestException('Use PATCH /radiology-orders/:id/report to record a report');
    }
    if (newStatus === RadiologyOrderStatus.REVIEWED) {
      throw new BadRequestException('Use PATCH /radiology-orders/:id/review to review a report');
    }

    this.assertValidTransition(order.status, newStatus);
    await this.assertRoleCanTransition(order, newStatus, caller);

    const data: {
      status: RadiologyOrderStatus;
      scheduledAt?: Date;
      cancelledAt?: Date;
      cancelReason?: string;
    } = { status: newStatus };

    if (newStatus === RadiologyOrderStatus.SCHEDULED) data.scheduledAt = new Date();
    if (newStatus === RadiologyOrderStatus.CANCELLED) {
      data.cancelledAt = new Date();
      if (dto.cancelReason) data.cancelReason = dto.cancelReason;
    }

    const result = await this.prisma.radiologyOrder.update({
      where: { id },
      data,
      select: ORDER_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'STATUS_TRANSITION', resource: 'radiology_order', resourceId: id });
    return result;
  }

  async upsertReport(id: string, dto: UpsertRadiologyReportDto, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      caller.role !== UserRole.ORG_ADMIN &&
      caller.role !== UserRole.TECHNICIAN
    ) {
      throw new ForbiddenException('Only TECHNICIAN, ORG_ADMIN, or SUPER_ADMIN can enter radiology reports');
    }

    if (order.status !== RadiologyOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Radiology report can only be entered when order status is IN_PROGRESS');
    }

    const reportData: {
      findings?: string;
      impression?: string;
      reportedAt?: Date;
      reportedById?: string;
    } = {
      ...(dto.findings !== undefined ? { findings: dto.findings } : {}),
      ...(dto.impression !== undefined ? { impression: dto.impression } : {}),
      ...(dto.reportedAt ? { reportedAt: new Date(dto.reportedAt) } : {}),
    };

    // Best-effort: if caller has a Doctor profile, record them as report author.
    // TECHNICIAN has no Doctor profile — reportedById stays null in that case.
    const doctorProfile = await this.prisma.doctor.findFirst({
      where: { userId: caller.sub, deletedAt: null },
      select: { id: true },
    });
    if (doctorProfile) {
      reportData.reportedById = doctorProfile.id;
    }

    const [, updatedOrder] = await this.prisma.$transaction([
      this.prisma.radiologyReport.upsert({
        where: { radiologyOrderId: id },
        create: { radiologyOrderId: id, ...reportData },
        update: reportData,
      }),
      this.prisma.radiologyOrder.update({
        where: { id },
        data: { status: RadiologyOrderStatus.RESULTED },
        select: ORDER_SELECT,
      }),
    ]);
    await this.auditWriter.log({ caller, action: 'REPORT_ENTERED', resource: 'radiology_order', resourceId: id });
    await this.timelineWriter.log({
      organizationId: order.organizationId,
      patientId: order.patientId,
      eventType: MedicalTimelineEventType.RADIOLOGY_REPORT_ADDED,
      createdById: caller.sub,
      metadata: {
        radiologyOrderId: id,
        modality: order.modality,
        bodyPart: order.bodyPart ?? null,
        encounterId: order.encounterId ?? null,
      },
    });
    return updatedOrder;
  }

  async reviewReport(id: string, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      caller.role !== UserRole.ORG_ADMIN &&
      caller.role !== UserRole.DOCTOR
    ) {
      throw new ForbiddenException('Only DOCTOR, ORG_ADMIN, or SUPER_ADMIN can review radiology reports');
    }

    if (order.status !== RadiologyOrderStatus.RESULTED) {
      throw new BadRequestException('Radiology order must be in RESULTED status to be reviewed');
    }

    if (!order.report) {
      throw new BadRequestException('No radiology report found to review');
    }

    let reviewedById: string | null = null;
    const doctorProfile = await this.prisma.doctor.findFirst({
      where: { userId: caller.sub, deletedAt: null },
      select: { id: true },
    });
    if (caller.role === UserRole.DOCTOR && !doctorProfile) {
      throw new ForbiddenException('Doctor profile not found for this user');
    }
    reviewedById = doctorProfile?.id ?? null;

    const [, updatedOrder] = await this.prisma.$transaction([
      this.prisma.radiologyReport.update({
        where: { radiologyOrderId: id },
        data: {
          ...(reviewedById ? { reviewedById } : {}),
          reviewedAt: new Date(),
        },
      }),
      this.prisma.radiologyOrder.update({
        where: { id },
        data: { status: RadiologyOrderStatus.REVIEWED },
        select: ORDER_SELECT,
      }),
    ]);
    await this.auditWriter.log({ caller, action: 'REPORT_REVIEWED', resource: 'radiology_order', resourceId: id });
    await this.timelineWriter.log({
      organizationId: order.organizationId,
      patientId: order.patientId,
      eventType: MedicalTimelineEventType.RADIOLOGY_REPORT_REVIEWED,
      createdById: caller.sub,
      metadata: {
        radiologyOrderId: id,
        modality: order.modality,
        ...(order.bodyPart ? { bodyPart: order.bodyPart } : {}),
        encounterId: order.encounterId ?? null,
        ...(reviewedById ? { reviewedById } : {}),
      },
    });
    return updatedOrder;
  }

  async remove(id: string, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    if (caller.role === UserRole.DOCTOR) {
      const doctor = await this.resolveCallerDoctor(caller);
      if (order.orderedById !== doctor.id) {
        throw new ForbiddenException('Doctors can only delete their own radiology orders');
      }
    }

    const result = await this.prisma.radiologyOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ORDER_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'SOFT_DELETE', resource: 'radiology_order', resourceId: id });
    return result;
  }

  async findByPatient(patientId: string, query: RadiologyQueryDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access patient from another organization');
    }

    return this.prisma.radiologyOrder.findMany({
      where: {
        patientId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...this.createdAtFilter(query.from, query.to),
      },
      select: ORDER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveCreateOrgId(dto: CreateRadiologyOrderDto, caller: JwtPayload): Promise<string> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (dto.organizationId) return dto.organizationId;
      const patient = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!patient) throw new NotFoundException('Patient not found');
      return patient.organizationId;
    }
    if (dto.organizationId && dto.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot create radiology order for another organization');
    }
    return caller.organizationId;
  }

  private resolveReadOrgId(query: RadiologyQueryDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) return query.organizationId;
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access radiology orders for another organization');
    }
    return caller.organizationId;
  }

  private async fetchOrder(id: string) {
    const order = await this.prisma.radiologyOrder.findFirst({
      where: { id, deletedAt: null },
      select: ORDER_SELECT,
    });
    if (!order) throw new NotFoundException('Radiology order not found');
    return order;
  }

  private assertOrgAccess(order: { organizationId: string }, caller: JwtPayload): void {
    if (caller.role !== UserRole.SUPER_ADMIN && order.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access radiology order from another organization');
    }
  }

  private assertValidTransition(from: RadiologyOrderStatus, to: RadiologyOrderStatus): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestException(`Invalid status transition: ${from} → ${to}`);
    }
  }

  private async assertRoleCanTransition(
    order: { status: RadiologyOrderStatus; orderedById: string },
    newStatus: RadiologyOrderStatus,
    caller: JwtPayload,
  ): Promise<void> {
    const { role } = caller;

    if (role === UserRole.NURSE) {
      if (order.status !== RadiologyOrderStatus.ORDERED || newStatus !== RadiologyOrderStatus.SCHEDULED) {
        throw new ForbiddenException('NURSE can only transition ORDERED → SCHEDULED');
      }
      return;
    }

    if (role === UserRole.TECHNICIAN) {
      if (order.status !== RadiologyOrderStatus.SCHEDULED || newStatus !== RadiologyOrderStatus.IN_PROGRESS) {
        throw new ForbiddenException('TECHNICIAN can only transition SCHEDULED → IN_PROGRESS via /status');
      }
      return;
    }

    if (role === UserRole.DOCTOR) {
      if (newStatus === RadiologyOrderStatus.CANCELLED) {
        const doctor = await this.resolveCallerDoctor(caller);
        if (order.orderedById !== doctor.id) {
          throw new ForbiddenException('Doctors can only cancel their own radiology orders');
        }
      } else if (newStatus !== RadiologyOrderStatus.SCHEDULED) {
        throw new ForbiddenException('DOCTOR can only transition to SCHEDULED via /status');
      }
      return;
    }

    // SUPER_ADMIN and ORG_ADMIN: any valid transition is allowed
  }

  private async resolveCallerDoctor(caller: JwtPayload): Promise<{ id: string }> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId: caller.sub, deletedAt: null },
      select: { id: true },
    });
    if (!doctor) throw new ForbiddenException('Doctor profile not found for this user');
    return doctor;
  }

  private async assertDoctorBelongsToOrg(doctorId: string, orgId: string): Promise<void> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, deletedAt: null, user: { organizationId: orgId, deletedAt: null } },
      select: { id: true },
    });
    if (!doctor) throw new BadRequestException('Doctor does not belong to this organization');
  }

  private async assertBranchBelongsToOrg(branchId: string, orgId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Branch does not belong to this organization');
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

  private createdAtFilter(from?: string, to?: string) {
    if (!from && !to) return {};
    return {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }
}
