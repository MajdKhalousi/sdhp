import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  ClinicPatientStatus,
  InvoiceStatus,
  LabOrderStatus,
  QueueStatus,
  RadiologyOrderStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TodayHubQueryDto } from './dto/today-hub-query.dto';

const BILLING_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT]);
const PATIENT_STAT_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SECRETARY]);
// Today Hub billing gate: mirrors BILLING_ROLES minus SUPER_ADMIN (blocked in V1).
// SECRETARY is intentionally excluded — not in billing roles anywhere in the product.
const TODAY_HUB_BILLING_ROLES = new Set<UserRole>([UserRole.ORG_ADMIN, UserRole.ACCOUNTANT]);

// Roles that receive the startEncounter payload (Patient.id + Doctor.id) in Today Hub rows.
// Only ORG_ADMIN and DOCTOR can create encounters; all other roles receive null.
const TODAY_HUB_ENCOUNTER_ROLES = new Set<UserRole>([UserRole.ORG_ADMIN, UserRole.DOCTOR]);

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
      completedLabsToday,
      completedRadiologyToday,
      collectedTodayAgg,
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

      // 11. Lab orders completed today — LabOrder has no completedAt/resultedAt; updatedAt is the proxy
      this.prisma.labOrder.count({
        where: {
          ...orgFilter,
          ...branchFilter,
          ...(doctorId ? { orderedById: doctorId } : {}),
          deletedAt: null,
          status: { in: [LabOrderStatus.RESULTED, LabOrderStatus.REVIEWED] },
          updatedAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // 12. Radiology orders completed today — RadiologyOrder has no completedAt/resultedAt; updatedAt is the proxy
      this.prisma.radiologyOrder.count({
        where: {
          ...orgFilter,
          ...branchFilter,
          ...(doctorId ? { orderedById: doctorId } : {}),
          deletedAt: null,
          status: { in: [RadiologyOrderStatus.RESULTED, RadiologyOrderStatus.REVIEWED] },
          updatedAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // 13. Payments received today — aggregated by payment.paidAt (billing roles only)
      isBillingRole
        ? this.prisma.payment.aggregate({
            where: {
              voidedAt: null,
              paidAt: { gte: todayStart, lt: todayEnd },
              invoice: {
                ...(orgId ? { organizationId: orgId } : {}),
                ...(query.branchId ? { branchId: query.branchId } : {}),
                deletedAt: null,
              },
            },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
    ]);

    // Appointments
    const byAppt = new Map(apptGroups.map((g) => [g.status, g._count._all]));
    const apptTotal = apptGroups.reduce((s, g) => s + g._count._all, 0);

    // Queue — WAITING + CALLED both mean "waiting to be seen"
    const byQueue = new Map(queueGroups.map((g) => [g.status, g._count._all]));

    // Billing
    let billing: {
      collectedToday: number;
      invoicedToday: number;
      outstandingAllTime: number;
      collectionRateToday: number;
      unpaidInvoiceCount: number;
    } | null = null;

    if (isBillingRole && billingPeriodGroups !== null && billingOutstandingAgg !== null && collectedTodayAgg !== null) {
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
      const collectedToday = collectedTodayAgg._sum.amount?.toNumber() ?? 0;
      const outstandingTotal = billingOutstandingAgg._sum.totalAmount?.toNumber() ?? 0;
      const outstandingPaid = billingOutstandingAgg._sum.paidAmount?.toNumber() ?? 0;
      billing = {
        collectedToday,
        invoicedToday: totalInvoicedToday,
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
        labOrders: { pending: pendingLabs, completedToday: completedLabsToday },
        radiologyOrders: { pending: pendingRadiology, completedToday: completedRadiologyToday },
        newPatients,
        activeEncounters,
        followUpsOverdue,
      },
      billing,
    };
  }

  async getTodayHub(query: TodayHubQueryDto, caller: JwtPayload) {
    // SUPER_ADMIN excluded from V1 — cross-org semantics are undefined for this view.
    if (caller.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Today Hub is not available for SUPER_ADMIN in V1. Use /dashboard/overview with an organizationId.',
      );
    }

    const orgId = caller.organizationId!;

    if (query.branchId) {
      await this.assertBranchBelongsToOrg(query.branchId, orgId);
    }

    const dateStr = query.date ?? todayDamascus();
    const { gte: dayStart, lt: dayEnd } = this.buildDayRange(dateStr);

    // DOCTOR role: resolve own doctor profile; ignore query.doctorId for security.
    // Same pattern as getOverview and appointments.service buildWhere.
    let doctorId: string | undefined;
    if (caller.role === UserRole.DOCTOR) {
      const profile = await this.prisma.doctor.findFirst({
        where: { userId: caller.sub, deletedAt: null },
        select: { id: true },
      });
      if (!profile) return this.emptyTodayHub(dateStr);
      doctorId = profile.id;
    } else if (query.doctorId) {
      doctorId = query.doctorId;
    }

    const branchFilter = query.branchId ? { branchId: query.branchId } : {};
    const doctorFilter = doctorId ? { doctorId } : {};
    const canSeeBilling = TODAY_HUB_BILLING_ROLES.has(caller.role);
    const canSeeEncounterIds = TODAY_HUB_ENCOUNTER_ROLES.has(caller.role);

    const rows = await this.prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        ...branchFilter,
        ...doctorFilter,
        // Phase 126 access gate: only return appointments for patients that have an
        // ACTIVE ClinicPatient link for this org. Equivalent to assertPatientLinkedToOrg
        // but applied as a bulk Prisma predicate rather than N per-row calls.
        patient: {
          clinicLinks: {
            some: {
              organizationId: orgId,
              status: ClinicPatientStatus.ACTIVE,
              deletedAt: null,
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 200,
      select: {
        id: true,
        scheduledAt: true,
        durationMin: true,
        status: true,
        visitType: {
          select: { name: true, nameAr: true },
        },
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            // Fetch the ACTIVE clinic link to obtain clinicPatientId for frontend navigation.
            // The where filter above guarantees at least one such link exists.
            clinicLinks: {
              where: {
                organizationId: orgId,
                status: ClinicPatientStatus.ACTIVE,
                deletedAt: null,
              },
              select: { id: true },
              take: 1,
            },
          },
        },
        doctor: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                firstNameAr: true,
                lastNameAr: true,
              },
            },
          },
        },
        // 1:1 optional back-relation (QueueEntry.appointmentId is @unique).
        // Include deletedAt so we can discard soft-deleted entries in mapping.
        queueEntry: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            calledAt: true,
            deletedAt: true,
          },
        },
        // 1:1 optional back-relation (Encounter.appointmentId is @unique).
        // Include deletedAt so we can discard soft-deleted encounters in mapping.
        encounter: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            deletedAt: true,
          },
        },
        // Latest non-cancelled, non-deleted invoice linked to this appointment.
        invoices: {
          where: {
            deletedAt: null,
            status: { not: InvoiceStatus.CANCELLED },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
          },
        },
      },
    });

    const entries = rows.map((row) => {
      const clinicLink = row.patient.clinicLinks[0];

      const rawQueue = row.queueEntry;
      const queue =
        rawQueue && rawQueue.deletedAt === null
          ? {
              id: rawQueue.id,
              ticketNumber: rawQueue.ticketNumber,
              status: rawQueue.status,
              calledAt: rawQueue.calledAt,
            }
          : null;

      const rawEncounter = row.encounter;
      const encounter =
        rawEncounter && rawEncounter.deletedAt === null
          ? {
              id: rawEncounter.id,
              startedAt: rawEncounter.startedAt,
              endedAt: rawEncounter.endedAt,
            }
          : null;

      // Only expose invoice fields to billing-visible roles (ORG_ADMIN, ACCOUNTANT).
      // DOCTOR/NURSE/SECRETARY and other non-billing roles receive null regardless of DB state.
      const rawInvoice = canSeeBilling ? row.invoices[0] : undefined;
      const invoice = rawInvoice
        ? {
            id: rawInvoice.id,
            invoiceNumber: rawInvoice.invoiceNumber,
            status: rawInvoice.status,
            totalAmount: rawInvoice.totalAmount,
            paidAmount: rawInvoice.paidAmount,
          }
        : null;

      // Expose internal DB UUIDs needed to call POST /v1/encounters — restricted to
      // ORG_ADMIN and DOCTOR only, and only when the row is actually eligible
      // (queue status is CALLED and no encounter has started yet).
      // All other roles and all non-CALLED rows receive null.
      const startEncounter =
        canSeeEncounterIds &&
        queue !== null &&
        queue.status === QueueStatus.CALLED &&
        encounter === null
          ? { patientId: row.patient.id, doctorId: row.doctor.id }
          : null;

      return {
        appointment: {
          id: row.id,
          scheduledAt: row.scheduledAt,
          durationMin: row.durationMin,
          status: row.status,
          visitType: row.visitType
            ? { name: row.visitType.name, nameAr: row.visitType.nameAr }
            : null,
        },
        patient: {
          clinicPatientId: clinicLink?.id ?? null,
          mrn: row.patient.mrn,
          firstName: row.patient.firstName,
          lastName: row.patient.lastName,
          firstNameAr: row.patient.firstNameAr,
          lastNameAr: row.patient.lastNameAr,
        },
        doctor: {
          userId: row.doctor.user.id,
          firstName: row.doctor.user.firstName,
          lastName: row.doctor.user.lastName,
          firstNameAr: row.doctor.user.firstNameAr,
          lastNameAr: row.doctor.user.lastNameAr,
        },
        queue,
        encounter,
        invoice,
        startEncounter,
      };
    });

    const summary = {
      total: entries.length,
      // Not yet checked in (no queue entry)
      scheduled: entries.filter(
        (e) =>
          (e.appointment.status === AppointmentStatus.SCHEDULED ||
            e.appointment.status === AppointmentStatus.CONFIRMED ||
            e.appointment.status === AppointmentStatus.CHECKED_IN) &&
          !e.queue,
      ).length,
      // In queue, waiting to be called
      waiting: entries.filter(
        (e) => e.queue?.status === QueueStatus.WAITING || e.queue?.status === QueueStatus.CALLED,
      ).length,
      // With doctor now
      inProgress: entries.filter((e) => e.queue?.status === QueueStatus.IN_PROGRESS).length,
      // Visit concluded (completed normally, cancelled, or no-show — all terminal states)
      done: entries.filter(
        (e) =>
          e.appointment.status === AppointmentStatus.COMPLETED ||
          e.appointment.status === AppointmentStatus.CANCELLED ||
          e.appointment.status === AppointmentStatus.NO_SHOW ||
          e.queue?.status === QueueStatus.DONE ||
          e.queue?.status === QueueStatus.SKIPPED,
      ).length,
      // Invoice counters are meaningful only for billing-visible roles.
      // Non-billing roles (DOCTOR, NURSE, SECRETARY) always receive 0 to avoid
      // leaking financial data through aggregate counts.
      unpaid: canSeeBilling ? entries.filter((e) => e.invoice?.status === InvoiceStatus.ISSUED).length : 0,
      partialPaid: canSeeBilling ? entries.filter((e) => e.invoice?.status === InvoiceStatus.PARTIALLY_PAID).length : 0,
    };

    return { date: dateStr, summary, entries };
  }

  private emptyTodayHub(date: string) {
    return {
      date,
      summary: { total: 0, scheduled: 0, waiting: 0, inProgress: 0, done: 0, unpaid: 0, partialPaid: 0 },
      entries: [],
    };
  }

  // Mirrors the same Damascus-timezone day-boundary logic in appointments.service.ts.
  // 'date' is a YYYY-MM-DD string in Asia/Damascus (UTC+3, no DST since 2022).
  private buildDayRange(date: string): { gte: Date; lt: Date } {
    const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
    const start = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - TZ_OFFSET_MS);
    return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }

  private emptyResponse() {
    return {
      today: {
        appointments: { total: 0, completed: 0, cancelled: 0, noShow: 0 },
        queue: { waiting: 0, inProgress: 0, done: 0 },
        followUpsDue: 0,
        labOrders: { pending: 0, completedToday: 0 },
        radiologyOrders: { pending: 0, completedToday: 0 },
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
