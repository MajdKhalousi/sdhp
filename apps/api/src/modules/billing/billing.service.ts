import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { BillingQueryDto } from './dto/billing-query.dto';
import { UpdateBillingPolicyDto } from './dto/update-billing-policy.dto';
import { OutstandingPatientsQueryDto } from './dto/outstanding-patients-query.dto';
import { AuditLogsWriterService } from '../audit-logs/audit-logs-writer.service';
import { PaginatedResponse } from '../../common/types/paginated-response.type';

// ── Select constants ───────────────────────────────────────────────────────

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
} as const;

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  organizationId: true,
  isActive: true,
} as const;

const ITEM_SELECT = {
  id: true,
  invoiceId: true,
  visitTypeId: true,
  serviceId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  totalPrice: true,
  discount: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PAYMENT_SELECT = {
  id: true,
  invoiceId: true,
  amount: true,
  method: true,
  referenceNumber: true,
  notes: true,
  paidAt: true,
  receivedById: true,
  voidedAt: true,
  voidReason: true,
  voidedById: true,
  createdAt: true,
  updatedAt: true,
  receivedBy: { select: USER_SELECT },
} as const;

const BILLING_POLICY_SELECT = {
  id: true,
  organizationId: true,
  autoCreateInvoiceOnCheckin: true,
  invoiceNumberPrefix: true,
  freeFollowUpWindowDays: true,
  followUpDiscountPercent: true,
  requirePaymentBeforeEncounter: true,
  defaultDueDateDays: true,
  noShowFeeAmount: true,
  createdAt: true,
  updatedAt: true,
} as const;

const INVOICE_SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  patientId: true,
  appointmentId: true,
  encounterId: true,
  createdById: true,
  invoiceNumber: true,
  status: true,
  subtotal: true,
  discountAmount: true,
  totalAmount: true,
  paidAmount: true,
  notes: true,
  issuedAt: true,
  dueDate: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: PATIENT_SELECT },
  createdBy: { select: USER_SELECT },
  items: { select: ITEM_SELECT, orderBy: { createdAt: 'asc' as const } },
  payments: { select: PAYMENT_SELECT, orderBy: { paidAt: 'asc' as const } },
} as const;

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async create(dto: CreateInvoiceDto, caller: JwtPayload) {
    const orgId = await this.resolveCreateOrgId(dto, caller);

    if (dto.discountAmount !== undefined && dto.discountAmount > 0) {
      throw new BadRequestException(
        'discountAmount must be 0 on invoice creation — no items exist yet',
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, dto.patientId, caller);

    if (dto.branchId) await this.assertBranchBelongsToOrg(dto.branchId, orgId);
    if (dto.appointmentId) await this.assertAppointmentBelongsToOrg(dto.appointmentId, orgId);
    if (dto.encounterId) {
      await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);
    }

    if (dto.appointmentId) {
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          appointmentId: dto.appointmentId,
          deletedAt: null,
          status: { not: InvoiceStatus.CANCELLED },
        },
        select: { id: true },
      });
      if (existingInvoice) {
        throw new BadRequestException('Appointment already invoiced');
      }
    }

    // Look up appointment's visit type before entering the retry loop so we only query once.
    let autoVisitTypeItem: { id: string; name: string; basePrice: number } | null = null;
    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, deletedAt: null },
        select: {
          visitType: { select: { id: true, name: true, basePrice: true, deletedAt: true } },
        },
      });
      const vt = appt?.visitType;
      if (vt && vt.deletedAt === null && vt.basePrice !== null) {
        autoVisitTypeItem = { id: vt.id, name: vt.name, basePrice: vt.basePrice.toNumber() };
      }
    }

    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const invoiceNumber = await this.allocateInvoiceNumber(orgId);

      try {
        const invoice = await this.prisma.invoice.create({
          data: {
            organizationId: orgId,
            branchId: dto.branchId,
            patientId: dto.patientId,
            appointmentId: dto.appointmentId,
            encounterId: dto.encounterId,
            createdById: caller.sub,
            invoiceNumber,
            subtotal: 0,
            discountAmount: 0,
            totalAmount: 0,
            notes: dto.notes,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          },
          select: { id: true },
        });

        if (autoVisitTypeItem) {
          const vtPrice = autoVisitTypeItem.basePrice;
          await this.prisma.$transaction([
            this.prisma.invoiceItem.create({
              data: {
                invoiceId: invoice.id,
                visitTypeId: autoVisitTypeItem.id,
                description: autoVisitTypeItem.name,
                quantity: 1,
                unitPrice: vtPrice,
                discount: 0,
                totalPrice: vtPrice,
              },
            }),
            this.prisma.invoice.update({
              where: { id: invoice.id },
              data: { subtotal: vtPrice, totalAmount: vtPrice },
            }),
          ]);
        }

        const result = await this.fetchInvoice(invoice.id);
        await this.auditWriter.log({ caller, action: 'INVOICE_CREATED', resource: 'invoice', resourceId: result.id });
        return result;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // Sequence number collided with a legacy count-based invoice — increment again.
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException('Failed to generate a unique invoice number after multiple attempts');
  }

  async findAll(query: BillingQueryDto, caller: JwtPayload): Promise<PaginatedResponse<any> & { totalPages: number }> {
    const orgId = this.resolveReadOrgId(query, caller);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const isClinicalRole = caller.role === UserRole.DOCTOR || caller.role === UserRole.NURSE;

    // DOCTOR/NURSE never see the org-wide, all-time list the billing roles get —
    // narrow to patients with an appointment in the (defaulted-to-today) window,
    // and pin the invoice date filter to that same window.
    let clinicalPatientWhere: { patientId: string } | { patientId: { in: string[] } } | {} = {};
    let dateFilter = this.createdAtFilter(query.from, query.to);

    if (isClinicalRole) {
      const { start, end } = this.resolveClinicalWindow(query.from, query.to);
      dateFilter = { createdAt: { gte: start, lte: end } };
      const scopedPatientIds = await this.resolveClinicalScopePatientIds(
        caller,
        query.branchId,
        start,
        end,
      );
      if (query.patientId) {
        clinicalPatientWhere = scopedPatientIds.includes(query.patientId)
          ? { patientId: query.patientId }
          : { patientId: { in: [] } };
      } else {
        clinicalPatientWhere = { patientId: { in: scopedPatientIds } };
      }
    }

    const where = {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(isClinicalRole
        ? clinicalPatientWhere
        : query.patientId
          ? { patientId: query.patientId }
          : {}),
      ...(query.status ? { status: query.status } : {}),
      deletedAt: null as null,
      ...dateFilter,
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' as const } },
              { patient: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
              { patient: { lastName: { contains: query.search, mode: 'insensitive' as const } } },
              { patient: { mrn: { contains: query.search, mode: 'insensitive' as const } } },
              { patient: { phone: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: INVOICE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);
    await this.assertClinicalInvoiceAccess(invoice, caller);
    return invoice;
  }

  async getInvoiceForPdf(id: string, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);
    await this.assertClinicalInvoiceAccess(invoice, caller);
    const org = await this.prisma.organization.findUnique({
      where: { id: invoice.organizationId },
      select: { name: true, nameAr: true },
    });
    return { ...invoice, orgName: org?.name ?? '', orgNameAr: org?.nameAr ?? null };
  }

  async update(id: string, dto: UpdateInvoiceDto, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Invoice can only be updated while in DRAFT status');
    }

    const updateData: {
      notes?: string;
      dueDate?: Date;
      branchId?: string;
      discountAmount?: number;
      totalAmount?: number;
    } = {};

    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);

    if (dto.branchId !== undefined) {
      await this.assertBranchBelongsToOrg(dto.branchId, invoice.organizationId);
      updateData.branchId = dto.branchId;
    }

    if (dto.discountAmount !== undefined) {
      const subtotalNum = invoice.subtotal.toNumber();
      if (dto.discountAmount > subtotalNum) {
        throw new BadRequestException('discountAmount cannot exceed invoice subtotal');
      }
      updateData.discountAmount = dto.discountAmount;
      updateData.totalAmount = subtotalNum - dto.discountAmount;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      select: INVOICE_SELECT,
    });
  }

  async addItem(invoiceId: string, dto: AddInvoiceItemDto, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(invoiceId);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Items can only be added to DRAFT invoices');
    }

    // Resolve description and unitPrice — from service catalog or from DTO directly.
    let description: string;
    let unitPrice: number;
    let resolvedServiceId: string | undefined;

    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: {
          id: dto.serviceId,
          organizationId: invoice.organizationId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true, name: true, defaultPrice: true },
      });
      if (!service) {
        throw new BadRequestException('Service not found or not active in this organization');
      }
      description = dto.description ?? service.name;
      unitPrice = dto.unitPrice ?? service.defaultPrice.toNumber();
      resolvedServiceId = service.id;
    } else {
      if (!dto.description) {
        throw new BadRequestException('description is required when serviceId is not provided');
      }
      if (dto.unitPrice === undefined) {
        throw new BadRequestException('unitPrice is required when serviceId is not provided');
      }
      description = dto.description;
      unitPrice = dto.unitPrice;
    }

    const qty = dto.quantity ?? 1;
    const discount = dto.discount ?? 0;
    const totalPrice = qty * unitPrice - discount;
    if (totalPrice < 0) throw new BadRequestException('Item total price cannot be negative');

    const currentSubtotal = invoice.subtotal.toNumber();
    const currentDiscount = invoice.discountAmount.toNumber();
    const newSubtotal = currentSubtotal + totalPrice;
    const newTotalAmount = newSubtotal - currentDiscount;

    const [, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.invoiceItem.create({
        data: {
          invoiceId,
          serviceId: resolvedServiceId,
          description,
          quantity: qty,
          unitPrice,
          discount,
          totalPrice,
          notes: dto.notes,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { subtotal: newSubtotal, totalAmount: newTotalAmount },
        select: INVOICE_SELECT,
      }),
    ]);

    return updatedInvoice;
  }

  async removeItem(invoiceId: string, itemId: string, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(invoiceId);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Items can only be removed from DRAFT invoices');
    }

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
      select: { id: true, totalPrice: true },
    });
    if (!item) throw new NotFoundException('Invoice item not found');

    const currentSubtotal = invoice.subtotal.toNumber();
    const currentDiscount = invoice.discountAmount.toNumber();
    const newSubtotal = currentSubtotal - item.totalPrice.toNumber();
    const newTotalAmount = newSubtotal - currentDiscount;

    const [, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.invoiceItem.delete({ where: { id: itemId } }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { subtotal: newSubtotal, totalAmount: newTotalAmount },
        select: INVOICE_SELECT,
      }),
    ]);

    return updatedInvoice;
  }

  async issue(id: string, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be issued');
    }

    if (invoice.items.length === 0) {
      throw new BadRequestException('Cannot issue an empty invoice');
    }

    const result = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() },
      select: INVOICE_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'INVOICE_ISSUED', resource: 'invoice', resourceId: id });
    return result;
  }

  async cancel(id: string, dto: CancelInvoiceDto, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException('Only DRAFT or ISSUED invoices can be cancelled');
    }

    if (invoice.status === InvoiceStatus.ISSUED && invoice.paidAmount.toNumber() > 0) {
      throw new BadRequestException('Cannot cancel an invoice with recorded payments');
    }

    const result = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        ...(dto.cancelReason ? { cancelReason: dto.cancelReason } : {}),
      },
      select: INVOICE_SELECT,
    });
    await this.auditWriter.log({ caller, action: 'INVOICE_CANCELLED', resource: 'invoice', resourceId: id });
    return result;
  }

  async settleNoCharge(id: string, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException('Only issued invoices can be settled as no-charge.');
    }

    if (invoice.totalAmount.toNumber() !== 0) {
      throw new BadRequestException('Only zero-total invoices can be settled as no-charge.');
    }

    const result = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
      select: INVOICE_SELECT,
    });
    await this.auditWriter.log({
      caller,
      action: 'INVOICE_SETTLED_NO_CHARGE',
      resource: 'invoice',
      resourceId: id,
    });
    return result;
  }

  async recordPayment(id: string, dto: RecordPaymentDto, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status !== InvoiceStatus.ISSUED && invoice.status !== InvoiceStatus.PARTIALLY_PAID) {
      throw new BadRequestException(
        'Payments can only be recorded for ISSUED or PARTIALLY_PAID invoices',
      );
    }

    const paidAmountNum = invoice.paidAmount.toNumber();
    const totalAmountNum = invoice.totalAmount.toNumber();
    const remaining = totalAmountNum - paidAmountNum;

    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance of ${remaining.toFixed(2)}`,
      );
    }

    const newPaidAmount = paidAmountNum + dto.amount;
    const newStatus =
      newPaidAmount >= totalAmountNum ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const [, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId: id,
          amount: dto.amount,
          method: dto.method,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          receivedById: caller.sub,
        },
      }),
      this.prisma.invoice.update({
        where: { id },
        data: { paidAmount: { increment: dto.amount }, status: newStatus },
        select: INVOICE_SELECT,
      }),
    ]);

    await this.auditWriter.log({ caller, action: 'PAYMENT_CREATED', resource: 'invoice', resourceId: id });
    return updatedInvoice;
  }

  async findByPatient(patientId: string, query: BillingQueryDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, patientId, caller);

    return this.prisma.invoice.findMany({
      where: {
        patientId,
        ...(caller.role !== UserRole.SUPER_ADMIN ? { organizationId: caller.organizationId } : {}),
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...this.createdAtFilter(query.from, query.to),
      },
      select: INVOICE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getOutstandingPatients(query: OutstandingPatientsQueryDto, caller: JwtPayload) {
    const orgId = caller.organizationId;
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    if (query.branchId) await this.assertBranchBelongsToOrg(query.branchId, orgId);

    // Fetch all outstanding invoices with patient info.
    // Application-level grouping is intentional: Prisma groupBy cannot include nested
    // relation fields alongside _sum aggregates, and MVP clinic scale (hundreds of
    // outstanding invoices) makes in-process aggregation negligible.
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        totalAmount: { gt: 0 },
        deletedAt: null,
      },
      select: {
        patientId: true,
        totalAmount: true,
        paidAmount: true,
        issuedAt: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    const patientMap = new Map<string, {
      patientId: string;
      firstName: string;
      lastName: string;
      mrn: string;
      outstandingAmount: number;
      invoiceCount: number;
      oldestUnpaidAt: string | null;
    }>();

    for (const inv of invoices) {
      const outstanding = inv.totalAmount.toNumber() - inv.paidAmount.toNumber();
      if (outstanding <= 0) continue;

      const existing = patientMap.get(inv.patientId);
      if (existing) {
        existing.outstandingAmount += outstanding;
        existing.invoiceCount += 1;
        if (inv.issuedAt) {
          if (!existing.oldestUnpaidAt || inv.issuedAt < new Date(existing.oldestUnpaidAt)) {
            existing.oldestUnpaidAt = inv.issuedAt.toISOString();
          }
        }
      } else {
        patientMap.set(inv.patientId, {
          patientId: inv.patientId,
          firstName: inv.patient.firstName,
          lastName: inv.patient.lastName,
          mrn: inv.patient.mrn,
          outstandingAmount: outstanding,
          invoiceCount: 1,
          oldestUnpaidAt: inv.issuedAt ? inv.issuedAt.toISOString() : null,
        });
      }
    }

    const sorted = Array.from(patientMap.values()).sort(
      (a, b) => b.outstandingAmount - a.outstandingAmount,
    );
    const total = sorted.length;
    const data = sorted.slice((page - 1) * limit, page * limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPatientOutstandingBalance(patientId: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, patientId, caller);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        patientId,
        ...(caller.role !== UserRole.SUPER_ADMIN ? { organizationId: caller.organizationId } : {}),
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        totalAmount: { gt: 0 },
        deletedAt: null,
      },
      select: { totalAmount: true, paidAmount: true, issuedAt: true },
    });

    let outstandingAmount = 0;
    let oldestUnpaidAt: string | null = null;

    for (const inv of invoices) {
      const outstanding = inv.totalAmount.toNumber() - inv.paidAmount.toNumber();
      if (outstanding <= 0) continue;
      outstandingAmount += outstanding;
      if (inv.issuedAt) {
        if (!oldestUnpaidAt || inv.issuedAt < new Date(oldestUnpaidAt)) {
          oldestUnpaidAt = inv.issuedAt.toISOString();
        }
      }
    }

    return { outstandingAmount, invoiceCount: invoices.length, oldestUnpaidAt };
  }

  // ── Auto-invoice hooks ─────────────────────────────────────────────────────

  /**
   * Called when an appointment transitions to IN_PROGRESS.
   * Silently skips if policy disables auto-create, or a live invoice already exists.
   * Never throws — callers must catch and swallow.
   */
  async autoCreateInvoiceForAppointment(
    appt: {
      id: string;
      organizationId: string;
      branchId: string | null;
      patientId: string;
      visitTypeId: string | null;
      sourceEncounterId: string | null;
    },
    createdById: string,
  ): Promise<void> {
    // 1. Ensure policy row exists, read settings.
    const policy = await this.prisma.billingPolicy.upsert({
      where: { organizationId: appt.organizationId },
      create: { organizationId: appt.organizationId },
      update: {},
      select: {
        autoCreateInvoiceOnCheckin: true,
        freeFollowUpWindowDays: true,
        followUpDiscountPercent: true,
        defaultDueDateDays: true,
      },
    });

    if (!policy.autoCreateInvoiceOnCheckin) return;

    // 2. Skip if a live (non-cancelled) invoice already exists for this appointment.
    const existing = await this.prisma.invoice.findFirst({
      where: { appointmentId: appt.id, deletedAt: null, status: { not: InvoiceStatus.CANCELLED } },
      select: { id: true },
    });
    if (existing) return;

    // 3. Determine follow-up discount.
    let itemDiscountPercent = 0;
    const windowDays = policy.freeFollowUpWindowDays;
    const discountPct = policy.followUpDiscountPercent.toNumber();

    if (windowDays > 0 && discountPct > 0 && appt.sourceEncounterId) {
      const sourceEnc = await this.prisma.encounter.findFirst({
        where: { id: appt.sourceEncounterId, deletedAt: null },
        select: { startedAt: true },
      });
      if (sourceEnc) {
        const daysDiff = Math.floor((Date.now() - sourceEnc.startedAt.getTime()) / 86_400_000);
        if (daysDiff <= windowDays) itemDiscountPercent = discountPct;
      }
    }

    // 4. Atomically claim the next sequence number (shared with manual create).
    const invoiceNumber = await this.allocateInvoiceNumber(appt.organizationId);
    const dueDate =
      policy.defaultDueDateDays > 0
        ? new Date(Date.now() + policy.defaultDueDateDays * 86_400_000)
        : undefined;

    // 5. Resolve visit-type item (auto-line-item mirrors manual invoice creation).
    let visitTypeItem: { id: string; name: string; basePrice: number } | null = null;
    if (appt.visitTypeId) {
      const vt = await this.prisma.visitType.findFirst({
        where: { id: appt.visitTypeId, deletedAt: null },
        select: { id: true, name: true, basePrice: true },
      });
      if (vt && vt.basePrice !== null) {
        visitTypeItem = { id: vt.id, name: vt.name, basePrice: vt.basePrice.toNumber() };
      }
    }

    // 6. Create the DRAFT invoice.
    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: appt.organizationId,
        branchId: appt.branchId,
        patientId: appt.patientId,
        appointmentId: appt.id,
        createdById,
        invoiceNumber,
        subtotal: 0,
        discountAmount: 0,
        totalAmount: 0,
        dueDate,
      },
      select: { id: true },
    });

    // 7. Attach visit-type line item with any follow-up discount.
    if (visitTypeItem) {
      const unitPrice = visitTypeItem.basePrice;
      const itemDiscount = itemDiscountPercent > 0
        ? parseFloat((unitPrice * itemDiscountPercent / 100).toFixed(2))
        : 0;
      const totalPrice = parseFloat((unitPrice - itemDiscount).toFixed(2));

      await this.prisma.$transaction([
        this.prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            visitTypeId: visitTypeItem.id,
            description: visitTypeItem.name,
            quantity: 1,
            unitPrice,
            discount: itemDiscount,
            totalPrice,
          },
        }),
        this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { subtotal: unitPrice, discountAmount: itemDiscount, totalAmount: totalPrice },
        }),
      ]);
    }
  }

  /**
   * Called when an appointment is CANCELLED or NO_SHOW.
   * Cancels the DRAFT invoice if one exists. Never touches ISSUED/PARTIALLY_PAID/PAID.
   * Never throws — callers must catch and swallow.
   */
  async autoCancelDraftInvoiceForAppointment(appointmentId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { appointmentId, deletedAt: null, status: InvoiceStatus.DRAFT },
      select: { id: true },
    });
    if (!invoice) return;

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: 'Auto-cancelled: appointment cancelled or no-show',
      },
    });
  }

  async voidPayment(invoiceId: string, paymentId: string, dto: VoidPaymentDto, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(invoiceId);
    this.assertOrgAccess(invoice, caller);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot void a payment on a cancelled invoice');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoiceId },
      select: { id: true, amount: true, voidedAt: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.voidedAt !== null) {
      throw new BadRequestException('Payment has already been voided');
    }

    const newPaidAmount = Math.max(0, invoice.paidAmount.toNumber() - payment.amount.toNumber());
    const totalAmountNum = invoice.totalAmount.toNumber();

    let newStatus: InvoiceStatus;
    if (newPaidAmount <= 0) {
      newStatus = InvoiceStatus.ISSUED;
    } else if (newPaidAmount >= totalAmountNum) {
      newStatus = InvoiceStatus.PAID;
    } else {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    const [, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { voidedAt: new Date(), voidReason: dto.voidReason, voidedById: caller.sub },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaidAmount, status: newStatus },
        select: INVOICE_SELECT,
      }),
    ]);

    await this.auditWriter.log({
      caller,
      action: 'PAYMENT_VOIDED',
      resource: 'invoice',
      resourceId: invoiceId,
    });

    return updatedInvoice;
  }

  // ── Billing Policy ─────────────────────────────────────────────────────────

  async getBillingPolicy(caller: JwtPayload) {
    return this.prisma.billingPolicy.upsert({
      where: { organizationId: caller.organizationId },
      create: { organizationId: caller.organizationId },
      update: {},
      select: BILLING_POLICY_SELECT,
    });
  }

  async upsertBillingPolicy(dto: UpdateBillingPolicyDto, caller: JwtPayload) {
    return this.prisma.billingPolicy.upsert({
      where: { organizationId: caller.organizationId },
      create: { organizationId: caller.organizationId, ...dto },
      update: dto,
      select: BILLING_POLICY_SELECT,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Atomically claims the next invoice number from BillingPolicy.nextInvoiceSequence.
   * Shared by both manual create() and autoCreateInvoiceForAppointment() so that all
   * invoices for an org draw from a single monotonic counter.
   */
  private async allocateInvoiceNumber(orgId: string): Promise<string> {
    const seqRow = await this.prisma.billingPolicy.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, nextInvoiceSequence: 1 },
      update: { nextInvoiceSequence: { increment: 1 } },
      select: { nextInvoiceSequence: true, invoiceNumberPrefix: true },
    });
    const year = new Date().getFullYear();
    return `${seqRow.invoiceNumberPrefix}-${year}-${String(seqRow.nextInvoiceSequence).padStart(5, '0')}`;
  }

  private async resolveCreateOrgId(dto: CreateInvoiceDto, caller: JwtPayload): Promise<string> {
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
      throw new ForbiddenException('Cannot create invoice for another organization');
    }
    return caller.organizationId;
  }

  private resolveReadOrgId(query: BillingQueryDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) return query.organizationId;
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access invoices for another organization');
    }
    return caller.organizationId;
  }

  private async fetchInvoice(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: INVOICE_SELECT,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private assertOrgAccess(invoice: { organizationId: string }, caller: JwtPayload): void {
    if (caller.role !== UserRole.SUPER_ADMIN && invoice.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access invoice from another organization');
    }
  }

  /**
   * DOCTOR/NURSE pass the org-access check above but must not see invoices
   * outside their clinical relationship to the patient. 404 (not 403) so
   * existence of an out-of-scope invoice isn't disclosed.
   */
  private async assertClinicalInvoiceAccess(
    invoice: { patientId: string; branchId: string | null },
    caller: JwtPayload,
  ): Promise<void> {
    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      const hasRelationship = doctorProfile
        ? await this.prisma.appointment.findFirst({
            where: { patientId: invoice.patientId, doctorId: doctorProfile.id, deletedAt: null },
            select: { id: true },
          })
        : null;
      if (!hasRelationship) throw new NotFoundException('Invoice not found');
      return;
    }

    if (caller.role === UserRole.NURSE) {
      if (caller.branchId && invoice.branchId && invoice.branchId !== caller.branchId) {
        throw new NotFoundException('Invoice not found');
      }
    }
  }

  // Asia/Damascus = UTC+3, no DST since 2022 — hardcoded offset matches the
  // same convention used in reports.service.ts's damascusDayBoundary().
  private damascusTodayRange(): { start: Date; end: Date } {
    const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
    const now = new Date();
    const damascusShifted = new Date(now.getTime() + TZ_OFFSET_MS);
    const y = damascusShifted.getUTCFullYear();
    const m = damascusShifted.getUTCMonth();
    const d = damascusShifted.getUTCDate();
    return {
      start: new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - TZ_OFFSET_MS),
      end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - TZ_OFFSET_MS),
    };
  }

  private resolveClinicalWindow(from?: string, to?: string): { start: Date; end: Date } {
    const today = this.damascusTodayRange();
    return {
      start: from ? new Date(from) : today.start,
      end: to ? new Date(to) : today.end,
    };
  }

  /**
   * Patient IDs a DOCTOR/NURSE caller is allowed to see invoices for, given a date
   * window — DOCTOR: patients with an appointment under their own doctor profile in
   * the window; NURSE: patients with an appointment anywhere in the org in the window,
   * narrowed by branch when one is available. Never falls back to all-time/org-wide.
   */
  private async resolveClinicalScopePatientIds(
    caller: JwtPayload,
    branchId: string | undefined,
    start: Date,
    end: Date,
  ): Promise<string[]> {
    const apptWhere: Prisma.AppointmentWhereInput = {
      organizationId: caller.organizationId,
      deletedAt: null,
      scheduledAt: { gte: start, lte: end },
    };

    if (caller.role === UserRole.DOCTOR) {
      const doctorProfile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!doctorProfile) return [];
      apptWhere.doctorId = doctorProfile.id;
    } else {
      const effectiveBranchId = branchId ?? caller.branchId ?? undefined;
      if (effectiveBranchId) apptWhere.branchId = effectiveBranchId;
    }

    const appts = await this.prisma.appointment.findMany({
      where: apptWhere,
      select: { patientId: true },
      distinct: ['patientId'],
    });
    return appts.map((a) => a.patientId);
  }

  private async assertBranchBelongsToOrg(branchId: string, orgId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new BadRequestException('Branch does not belong to this organization');
  }

  private async assertAppointmentBelongsToOrg(
    appointmentId: string,
    orgId: string,
  ): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!appointment) throw new BadRequestException('Appointment does not belong to this organization');
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
