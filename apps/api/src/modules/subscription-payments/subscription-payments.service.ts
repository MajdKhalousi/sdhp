import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';

// Fields returned in every subscription payment response.
const SELECT = {
  id: true,
  organizationId: true,
  amount: true,
  currency: true,
  method: true,
  reference: true,
  notes: true,
  paidAt: true,
  periodStartAt: true,
  periodEndAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PaymentRecord = Prisma.SubscriptionPaymentGetPayload<{ select: typeof SELECT }>;

// Fields eligible for the ORGANIZATION_SUBSCRIPTION_PAYMENT_UPDATED audit diff.
const UPDATABLE_FIELDS = [
  'amount',
  'currency',
  'method',
  'reference',
  'notes',
  'paidAt',
  'periodStartAt',
  'periodEndAt',
] as const;

// Normalizes a value for diff comparison only — Date/Decimal objects compare
// by reference, not value, so two instances for the same value would
// otherwise look "changed" on every update. Mirrors the pattern used in
// OrganizationsService for the 133E subscription fields.
function normalizeForDiff(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

@Injectable()
export class SubscriptionPaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(organizationId: string): Promise<PaymentRecord[]> {
    await this.assertOrganizationExists(organizationId);

    return this.prisma.subscriptionPayment.findMany({
      where: { organizationId, deletedAt: null },
      select: SELECT,
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(
    organizationId: string,
    dto: CreateSubscriptionPaymentDto,
    caller: JwtPayload,
  ): Promise<PaymentRecord> {
    await this.assertOrganizationExists(organizationId);

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        organizationId,
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        reference: dto.reference,
        notes: dto.notes,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        periodStartAt: dto.periodStartAt ? new Date(dto.periodStartAt) : undefined,
        periodEndAt: dto.periodEndAt ? new Date(dto.periodEndAt) : undefined,
        createdByUserId: caller.sub,
      },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'ORGANIZATION_SUBSCRIPTION_PAYMENT_CREATED',
      resource: 'organization_subscription_payment',
      resourceId: payment.id,
      newData: toSnapshot(payment),
    });

    return payment;
  }

  async update(
    organizationId: string,
    paymentId: string,
    dto: UpdateSubscriptionPaymentDto,
    caller: JwtPayload,
  ): Promise<PaymentRecord> {
    const existing = await this.assertPaymentBelongsToOrg(organizationId, paymentId);

    const data: Prisma.SubscriptionPaymentUpdateInput = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.method !== undefined) data.method = dto.method;
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.paidAt !== undefined) data.paidAt = new Date(dto.paidAt);
    if (dto.periodStartAt !== undefined) {
      data.periodStartAt = dto.periodStartAt === null ? null : new Date(dto.periodStartAt);
    }
    if (dto.periodEndAt !== undefined) {
      data.periodEndAt = dto.periodEndAt === null ? null : new Date(dto.periodEndAt);
    }

    const updated = await this.prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data,
      select: SELECT,
    });

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (dto[field] === undefined) continue;
      if (normalizeForDiff(existing[field]) !== normalizeForDiff(updated[field])) {
        oldData[field] = existing[field];
        newData[field] = updated[field];
      }
    }

    if (Object.keys(newData).length > 0) {
      await this.auditWriter.log({
        caller,
        action: 'ORGANIZATION_SUBSCRIPTION_PAYMENT_UPDATED',
        resource: 'organization_subscription_payment',
        resourceId: updated.id,
        oldData: toSnapshot(oldData),
        newData: toSnapshot(newData),
      });
    }

    return updated;
  }

  async remove(organizationId: string, paymentId: string, caller: JwtPayload): Promise<void> {
    await this.assertPaymentBelongsToOrg(organizationId, paymentId);

    await this.prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: { deletedAt: new Date() },
    });

    await this.auditWriter.log({
      caller,
      action: 'ORGANIZATION_SUBSCRIPTION_PAYMENT_DELETED',
      resource: 'organization_subscription_payment',
      resourceId: paymentId,
      oldData: toSnapshot({ deletedAt: null }),
      newData: toSnapshot({ deletedAt: new Date() }),
    });
  }

  private async assertOrganizationExists(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
  }

  private async assertPaymentBelongsToOrg(
    organizationId: string,
    paymentId: string,
  ): Promise<PaymentRecord> {
    await this.assertOrganizationExists(organizationId);

    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { id: paymentId, organizationId, deletedAt: null },
      select: SELECT,
    });
    if (!payment) throw new NotFoundException('Subscription payment not found');
    return payment;
  }
}
