import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LabOrderStatus, MedicalTimelineEventType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderStatusDto } from './dto/update-lab-order-status.dto';
import { UpsertLabResultDto } from './dto/upsert-lab-result.dto';
import { LabQueryDto } from './dto/lab-query.dto';
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

const RESULT_SELECT = {
  id: true,
  labOrderId: true,
  resultValue: true,
  unit: true,
  referenceRange: true,
  interpretation: true,
  resultNotes: true,
  resultAt: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: { select: DOCTOR_SELECT },
} as const;

const ORDER_SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  patientId: true,
  encounterId: true,
  orderedById: true,
  testName: true,
  testCode: true,
  clinicalInfo: true,
  status: true,
  priority: true,
  notes: true,
  collectedAt: true,
  cancelReason: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: PATIENT_SELECT },
  orderedBy: { select: DOCTOR_SELECT },
  result: { select: RESULT_SELECT },
} as const;

// ── Valid status transitions for /status endpoint ──────────────────────────
// RESULTED is only reachable via /result; REVIEWED only via /review.

const VALID_TRANSITIONS: Partial<Record<LabOrderStatus, LabOrderStatus[]>> = {
  [LabOrderStatus.ORDERED]: [LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.CANCELLED],
  [LabOrderStatus.SAMPLE_COLLECTED]: [LabOrderStatus.IN_PROGRESS, LabOrderStatus.CANCELLED],
  [LabOrderStatus.IN_PROGRESS]: [LabOrderStatus.CANCELLED],
  [LabOrderStatus.RESULTED]: [LabOrderStatus.CANCELLED],
};

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class LabsService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private timelineWriter: MedicalTimelineWriterService,
  ) {}

  async create(dto: CreateLabOrderDto, caller: JwtPayload) {
    const orgId = await this.resolveCreateOrgId(dto, caller);

    // Validate patient exists and belongs to resolved org
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.organizationId !== orgId) {
      throw new ForbiddenException('Patient does not belong to this organization');
    }

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

    const result = await this.prisma.labOrder.create({
      data: {
        organizationId: orgId,
        branchId: dto.branchId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        orderedById,
        testName: dto.testName,
        testCode: dto.testCode,
        clinicalInfo: dto.clinicalInfo,
        priority: dto.priority,
        notes: dto.notes,
      },
      select: ORDER_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'CREATE', resource: 'lab_order', resourceId: result.id });
    await this.timelineWriter.log({
      organizationId: result.organizationId,
      patientId: result.patientId,
      eventType: MedicalTimelineEventType.LAB_ORDERED,
      createdById: caller.sub,
      metadata: {
        labOrderId: result.id,
        testName: result.testName,
        encounterId: result.encounterId ?? null,
      },
    });
    return result;
  }

  async findAll(query: LabQueryDto, caller: JwtPayload) {
    const orgId = this.resolveReadOrgId(query, caller);

    if (query.branchId && orgId) {
      await this.assertBranchBelongsToOrg(query.branchId, orgId);
    }

    return this.prisma.labOrder.findMany({
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

  async updateStatus(id: string, dto: UpdateLabOrderStatusDto, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    const { status: newStatus } = dto;

    if (newStatus === LabOrderStatus.RESULTED) {
      throw new BadRequestException('Use PATCH /lab-orders/:id/result to record a result');
    }
    if (newStatus === LabOrderStatus.REVIEWED) {
      throw new BadRequestException('Use PATCH /lab-orders/:id/review to review a result');
    }

    this.assertValidTransition(order.status, newStatus);
    await this.assertRoleCanTransition(order, newStatus, caller);

    const data: {
      status: LabOrderStatus;
      collectedAt?: Date;
      cancelledAt?: Date;
      cancelReason?: string;
    } = { status: newStatus };

    if (newStatus === LabOrderStatus.SAMPLE_COLLECTED) data.collectedAt = new Date();
    if (newStatus === LabOrderStatus.CANCELLED) {
      data.cancelledAt = new Date();
      if (dto.cancelReason) data.cancelReason = dto.cancelReason;
    }

    const result = await this.prisma.labOrder.update({
      where: { id },
      data,
      select: ORDER_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'STATUS_TRANSITION', resource: 'lab_order', resourceId: id });
    return result;
  }

  async upsertResult(id: string, dto: UpsertLabResultDto, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      caller.role !== UserRole.ORG_ADMIN &&
      caller.role !== UserRole.TECHNICIAN
    ) {
      throw new ForbiddenException('Only TECHNICIAN, ORG_ADMIN, or SUPER_ADMIN can enter lab results');
    }

    if (order.status !== LabOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Lab result can only be entered when order status is IN_PROGRESS');
    }

    const resultData = {
      ...(dto.resultValue !== undefined ? { resultValue: dto.resultValue } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.referenceRange !== undefined ? { referenceRange: dto.referenceRange } : {}),
      ...(dto.interpretation !== undefined ? { interpretation: dto.interpretation } : {}),
      ...(dto.resultNotes !== undefined ? { resultNotes: dto.resultNotes } : {}),
      ...(dto.resultAt ? { resultAt: new Date(dto.resultAt) } : {}),
    };

    const [, updatedOrder] = await this.prisma.$transaction([
      this.prisma.labResult.upsert({
        where: { labOrderId: id },
        create: { labOrderId: id, ...resultData },
        update: resultData,
      }),
      this.prisma.labOrder.update({
        where: { id },
        data: { status: LabOrderStatus.RESULTED },
        select: ORDER_SELECT,
      }),
    ]);
    await this.auditWriter.log({ caller, action: 'RESULT_ENTERED', resource: 'lab_order', resourceId: id });
    await this.timelineWriter.log({
      organizationId: order.organizationId,
      patientId: order.patientId,
      eventType: MedicalTimelineEventType.LAB_RESULT_ADDED,
      createdById: caller.sub,
      metadata: {
        labOrderId: id,
        testName: order.testName,
        encounterId: order.encounterId ?? null,
      },
    });
    return updatedOrder;
  }

  async reviewResult(id: string, caller: JwtPayload) {
    const order = await this.fetchOrder(id);
    this.assertOrgAccess(order, caller);

    if (
      caller.role !== UserRole.SUPER_ADMIN &&
      caller.role !== UserRole.ORG_ADMIN &&
      caller.role !== UserRole.DOCTOR
    ) {
      throw new ForbiddenException('Only DOCTOR, ORG_ADMIN, or SUPER_ADMIN can review results');
    }

    if (order.status !== LabOrderStatus.RESULTED) {
      throw new BadRequestException('Lab order must be in RESULTED status to be reviewed');
    }

    if (!order.result) {
      throw new BadRequestException('No lab result found to review');
    }

    // Resolve reviewer doctor id — required for DOCTOR, best-effort for SA/OA
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
      this.prisma.labResult.update({
        where: { labOrderId: id },
        data: {
          ...(reviewedById ? { reviewedById } : {}),
          reviewedAt: new Date(),
        },
      }),
      this.prisma.labOrder.update({
        where: { id },
        data: { status: LabOrderStatus.REVIEWED },
        select: ORDER_SELECT,
      }),
    ]);
    await this.auditWriter.log({ caller, action: 'RESULT_REVIEWED', resource: 'lab_order', resourceId: id });
    await this.timelineWriter.log({
      organizationId: order.organizationId,
      patientId: order.patientId,
      eventType: MedicalTimelineEventType.LAB_RESULT_REVIEWED,
      createdById: caller.sub,
      metadata: {
        labOrderId: id,
        testName: order.testName,
        ...(order.testCode ? { testCode: order.testCode } : {}),
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
        throw new ForbiddenException('Doctors can only delete their own lab orders');
      }
    }

    const result = await this.prisma.labOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ORDER_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'SOFT_DELETE', resource: 'lab_order', resourceId: id });
    return result;
  }

  async findByPatient(patientId: string, query: LabQueryDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access patient from another organization');
    }

    return this.prisma.labOrder.findMany({
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

  private async resolveCreateOrgId(dto: CreateLabOrderDto, caller: JwtPayload): Promise<string> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (dto.organizationId) return dto.organizationId;
      // Derive org from patient when SA omits organizationId
      const patient = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!patient) throw new NotFoundException('Patient not found');
      return patient.organizationId;
    }
    if (dto.organizationId && dto.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot create lab order for another organization');
    }
    return caller.organizationId;
  }

  private resolveReadOrgId(query: LabQueryDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) return query.organizationId;
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access lab orders for another organization');
    }
    return caller.organizationId;
  }

  private async fetchOrder(id: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, deletedAt: null },
      select: ORDER_SELECT,
    });
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  private assertOrgAccess(order: { organizationId: string }, caller: JwtPayload): void {
    if (caller.role !== UserRole.SUPER_ADMIN && order.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access lab order from another organization');
    }
  }

  private assertValidTransition(from: LabOrderStatus, to: LabOrderStatus): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestException(`Invalid status transition: ${from} → ${to}`);
    }
  }

  private async assertRoleCanTransition(
    order: { status: LabOrderStatus; orderedById: string },
    newStatus: LabOrderStatus,
    caller: JwtPayload,
  ): Promise<void> {
    const { role } = caller;

    if (role === UserRole.NURSE) {
      if (order.status !== LabOrderStatus.ORDERED || newStatus !== LabOrderStatus.SAMPLE_COLLECTED) {
        throw new ForbiddenException('NURSE can only transition ORDERED → SAMPLE_COLLECTED');
      }
      return;
    }

    if (role === UserRole.TECHNICIAN) {
      if (order.status !== LabOrderStatus.SAMPLE_COLLECTED || newStatus !== LabOrderStatus.IN_PROGRESS) {
        throw new ForbiddenException('TECHNICIAN can only transition SAMPLE_COLLECTED → IN_PROGRESS via /status');
      }
      return;
    }

    if (role === UserRole.DOCTOR) {
      if (newStatus === LabOrderStatus.CANCELLED) {
        const doctor = await this.resolveCallerDoctor(caller);
        if (order.orderedById !== doctor.id) {
          throw new ForbiddenException('Doctors can only cancel their own lab orders');
        }
      } else if (newStatus !== LabOrderStatus.SAMPLE_COLLECTED) {
        throw new ForbiddenException('DOCTOR can only transition to SAMPLE_COLLECTED via /status');
      }
      return;
    }

    // SUPER_ADMIN and ORG_ADMIN: any valid transition is allowed (already validated above)
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
