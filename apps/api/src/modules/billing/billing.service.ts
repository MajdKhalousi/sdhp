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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { BillingQueryDto } from './dto/billing-query.dto';
import { AuditLogsWriterService } from '../audit-logs/audit-logs-writer.service';

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
  createdAt: true,
  updatedAt: true,
  receivedBy: { select: USER_SELECT },
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
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.organizationId !== orgId) {
      throw new ForbiddenException('Patient does not belong to this organization');
    }

    if (dto.branchId) await this.assertBranchBelongsToOrg(dto.branchId, orgId);
    if (dto.appointmentId) await this.assertAppointmentBelongsToOrg(dto.appointmentId, orgId);
    if (dto.encounterId) {
      await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);
    }

    // Look up appointment's visit type before entering the retry loop so we only query once.
    let autoVisitTypeItem: { id: string; name: string; basePrice: number } | null = null;
    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, deletedAt: null },
        select: {
          visitType: { select: { id: true, name: true, basePrice: true } },
        },
      });
      const vt = appt?.visitType;
      if (vt && vt.basePrice !== null) {
        autoVisitTypeItem = { id: vt.id, name: vt.name, basePrice: vt.basePrice.toNumber() };
      }
    }

    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const year = new Date().getFullYear();
      const prefix = `INV-${year}-`;
      const count = await this.prisma.invoice.count({
        where: { organizationId: orgId, invoiceNumber: { startsWith: prefix } },
      });
      const invoiceNumber = `${prefix}${String(count + 1).padStart(5, '0')}`;

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

        return this.fetchInvoice(invoice.id);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException('Failed to generate a unique invoice number after multiple attempts');
  }

  async findAll(query: BillingQueryDto, caller: JwtPayload) {
    const orgId = this.resolveReadOrgId(query, caller);

    return this.prisma.invoice.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.status ? { status: query.status } : {}),
        deletedAt: null,
        ...this.createdAtFilter(query.from, query.to),
      },
      select: INVOICE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const invoice = await this.fetchInvoice(id);
    this.assertOrgAccess(invoice, caller);
    return invoice;
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
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access patient from another organization');
    }

    return this.prisma.invoice.findMany({
      where: {
        patientId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...this.createdAtFilter(query.from, query.to),
      },
      select: INVOICE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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
