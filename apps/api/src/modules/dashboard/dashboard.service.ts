import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  InvoiceStatus,
  LabOrderStatus,
  QueueStatus,
  RadiologyOrderStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

const BILLING_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT]);
const PATIENT_STAT_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY]);

// Damascus is permanently UTC+3 (no DST since 2022)
const DAMASCUS_OFFSET_MS = 3 * 60 * 60 * 1000;

function todayDamascus(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

function getDamascusDayBoundaries(): { start: Date; end: Date } {
  const now = new Date();
  const damascusNow = new Date(now.getTime() + DAMASCUS_OFFSET_MS);
  const dateStr = damascusNow.toISOString().slice(0, 10);
  const start = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - DAMASCUS_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(query: DashboardQueryDto, caller: JwtPayload) {
    const orgId = this.resolveOrgId(query, caller);

    if (query.branchId && orgId) {
      await this.assertBranchBelongsToOrg(query.branchId, orgId);
    }

    const today = todayDamascus();
    const { start: todayStart, end: todayEnd } = getDamascusDayBoundaries();
    const isBillingRole = BILLING_ROLES.has(caller.role);
    const canSeePatients = PATIENT_STAT_ROLES.has(caller.role);

    // Resolve doctor profile once; return empty response if DOCTOR has no profile
    let doctorId: string | undefined;
    if (caller.role === UserRole.DOCTOR) {
      const profile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!profile) return this.emptyResponse();
      doctorId = profile.id;
    }

    const orgFilter = orgId ? { organizationId: orgId } : {};
    const branchFilter = query.branchId ? { branchId: query.branchId } : {};
    const doctorFilter = doctorId ? { doctorId } : {};

    // Queue entries do not have branchId directly — branch is joined via appointment.
    // Build a nested appointment filter only when needed to avoid unnecessary joins.
    const queueApptFilter =
      query.branchId || doctorId
        ? { appointment: { ...branchFilter, ...doctorFilter } }
        : {};

    const [
      apptGroups,
      queueGroups,
      followUpsDue,
      pendingLabs,
      pendingRadiology,
      newPatients,
      billingPeriodGroups,
      billingOutstandingAgg,
      activeEncounters,
      followUpsOverdue,
    ] = await Promise.all([
      // 1. Today's appointments grouped by status
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          ...orgFilter,
          ...branchFilter,
          ...doctorFilter,
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        _count: { _all: true },
      }),

      // 2. Today's queue entries grouped by status (businessDate is the Damascus date string)
      this.prisma.queueEntry.groupBy({
        by: ['status'],
        where: {
          businessDate: today,
          deletedAt: null,
          ...orgFilter,
          ...queueApptFilter,
        },
        _count: { _all: true },
      }),

      // 3. Follow-ups due today — encounters with followUpDate today and no COMPLETED follow-up appointment
      this.prisma.encounter.count({
        where: {
          ...orgFilter,
          ...doctorFilter,
          deletedAt: null,
          followUpDate: { gte: todayStart, lt: todayEnd },
          NOT: {
            followUpAppointments: {
              some: { deletedAt: null, status: AppointmentStatus.COMPLETED },
            },
          },
        },
      }),

      // 4. Pending lab orders — current open task backlog, no date filter
      this.prisma.labOrder.count({
        where: {
          ...orgFilter,
          ...branchFilter,
          ...(doctorId ? { orderedById: doctorId } : {}),
          deletedAt: null,
          status: {
            in: [LabOrderStatus.ORDERED, LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.IN_PROGRESS],
          },
        },
      }),

      // 5. Pending radiology orders — current open task backlog, no date filter
      this.prisma.radiologyOrder.count({
        where: {
          ...orgFilter,
          ...branchFilter,
          ...(doctorId ? { orderedById: doctorId } : {}),
          deletedAt: null,
          status: {
            in: [RadiologyOrderStatus.ORDERED, RadiologyOrderStatus.SCHEDULED, RadiologyOrderStatus.IN_PROGRESS],
          },
        },
      }),

      // 6. New patients registered today (admin/secretary only)
      canSeePatients
        ? this.prisma.patient.count({
            where: {
              ...orgFilter,
              deletedAt: null,
              createdAt: { gte: todayStart, lt: todayEnd },
            },
          })
        : Promise.resolve(0),

      // 7. Billing today — invoiced amount by status (billing roles only)
      isBillingRole
        ? this.prisma.invoice.groupBy({
            by: ['status'],
            where: {
              ...orgFilter,
              ...branchFilter,
              deletedAt: null,
              totalAmount: { gt: 0 },
              status: {
                in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID],
              },
              issuedAt: { gte: todayStart, lt: todayEnd },
            },
            _sum: { totalAmount: true, paidAmount: true },
            _count: { _all: true },
          })
        : Promise.resolve(null),

      // 8. All-time outstanding balance + count (billing roles only)
      isBillingRole
        ? this.prisma.invoice.aggregate({
            where: {
              ...orgFilter,
              ...branchFilter,
              deletedAt: null,
              totalAmount: { gt: 0 },
              status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
            },
            _sum: { totalAmount: true, paidAmount: true },
            _count: { _all: true },
          })
        : Promise.resolve(null),

      // 9. Active encounters today — started today, not yet ended
      this.prisma.encounter.count({
        where: {
          ...orgFilter,
          ...doctorFilter,
          deletedAt: null,
          endedAt: null,
          startedAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // 10. Overdue follow-ups — followUpDate before today, no completed follow-up appointment
      this.prisma.encounter.count({
        where: {
          ...orgFilter,
          ...doctorFilter,
          deletedAt: null,
          followUpDate: { lt: todayStart },
          NOT: {
            followUpAppointments: {
              some: { deletedAt: null, status: AppointmentStatus.COMPLETED },
            },
          },
        },
      }),
    ]);

    // Appointments
    const byAppt = new Map(apptGroups.map((g) => [g.status, g._count._all]));
    const apptTotal = apptGroups.reduce((s, g) => s + g._count._all, 0);

    // Queue — WAITING + CALLED both mean "waiting to be seen"
    const byQueue = new Map(queueGroups.map((g) => [g.status, g._count._all]));

    // Billing
    let billing: {
      collectedToday: number;
      outstandingAllTime: number;
      collectionRateToday: number;
      unpaidInvoiceCount: number;
    } | null = null;

    if (isBillingRole && billingPeriodGroups !== null && billingOutstandingAgg !== null) {
      const byInv = new Map(billingPeriodGroups.map((g) => [g.status, g]));
      const activeGroups = [
        byInv.get(InvoiceStatus.ISSUED),
        byInv.get(InvoiceStatus.PARTIALLY_PAID),
        byInv.get(InvoiceStatus.PAID),
      ];
      const totalInvoicedToday = activeGroups.reduce(
        (s, g) => s + (g?._sum.totalAmount?.toNumber() ?? 0),
        0,
      );
      const collectedToday = activeGroups.reduce(
        (s, g) => s + (g?._sum.paidAmount?.toNumber() ?? 0),
        0,
      );
      const outstandingTotal = billingOutstandingAgg._sum.totalAmount?.toNumber() ?? 0;
      const outstandingPaid = billingOutstandingAgg._sum.paidAmount?.toNumber() ?? 0;
      billing = {
        collectedToday,
        outstandingAllTime: Math.max(0, outstandingTotal - outstandingPaid),
        collectionRateToday:
          totalInvoicedToday === 0
            ? 0
            : Math.round((collectedToday / totalInvoicedToday) * 10000) / 100,
        unpaidInvoiceCount: billingOutstandingAgg._count._all ?? 0,
      };
    }

    return {
      today: {
        appointments: {
          total: apptTotal,
          completed: byAppt.get(AppointmentStatus.COMPLETED) ?? 0,
          cancelled: byAppt.get(AppointmentStatus.CANCELLED) ?? 0,
          noShow: byAppt.get(AppointmentStatus.NO_SHOW) ?? 0,
        },
        queue: {
          waiting: (byQueue.get(QueueStatus.WAITING) ?? 0) + (byQueue.get(QueueStatus.CALLED) ?? 0),
          inProgress: byQueue.get(QueueStatus.IN_PROGRESS) ?? 0,
          done: byQueue.get(QueueStatus.DONE) ?? 0,
        },
        followUpsDue,
        labOrders: { pending: pendingLabs },
        radiologyOrders: { pending: pendingRadiology },
        newPatients,
        activeEncounters,
        followUpsOverdue,
      },
      billing,
    };
  }

  private emptyResponse() {
    return {
      today: {
        appointments: { total: 0, completed: 0, cancelled: 0, noShow: 0 },
        queue: { waiting: 0, inProgress: 0, done: 0 },
        followUpsDue: 0,
        labOrders: { pending: 0 },
        radiologyOrders: { pending: 0 },
        newPatients: 0,
        activeEncounters: 0,
        followUpsOverdue: 0,
      },
      billing: null,
    };
  }

  private resolveOrgId(query: DashboardQueryDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) {
      return query.organizationId;
    }
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access dashboard data for another organization');
    }
    return caller.organizationId;
  }

  private async assertBranchBelongsToOrg(branchId: string, orgId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('Branch does not belong to this organization or does not exist');
    }
  }
}
