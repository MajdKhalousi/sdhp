import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, QueueStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ── Public report methods ──────────────────────────────────────────────────

  async getSummary(query: ReportQueryDto, caller: JwtPayload) {
    const ctx = await this.buildContext(query, caller);
    const { orgId, branchId, from, to } = ctx;

    const apptWhere = this.apptWhere(orgId, branchId, from, to);
    const encWhere = this.encWhere(orgId, branchId, from, to);

    const [
      totalPatients,
      activePatients,
      totalUsers,
      totalDoctors,
      activeDoctors,
      totalAppointments,
      appointmentsToday,
      upcomingAppointments,
      apptGroups,
      totalEncounters,
      totalPrescriptions,
      queueGroups,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { ...(orgId ? { organizationId: orgId } : {}), deletedAt: null } }),
      this.prisma.patient.count({ where: { ...(orgId ? { organizationId: orgId } : {}), deletedAt: null, isActive: true } }),

      this.prisma.user.count({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          deletedAt: null,
          role: { not: UserRole.SUPER_ADMIN },
        },
      }),

      this.prisma.doctor.count({
        where: {
          deletedAt: null,
          ...(orgId ? { user: { organizationId: orgId, deletedAt: null } } : {}),
        },
      }),
      this.prisma.doctor.count({
        where: {
          deletedAt: null,
          isActive: true,
          ...(orgId ? { user: { organizationId: orgId, deletedAt: null } } : {}),
        },
      }),

      this.prisma.appointment.count({ where: apptWhere }),
      this.prisma.appointment.count({ where: { ...(orgId ? { organizationId: orgId } : {}), deletedAt: null, scheduledAt: { gte: this.startOfToday(), lte: this.endOfToday() } } }),
      this.prisma.appointment.count({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          deletedAt: null,
          scheduledAt: { gt: new Date() },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        },
      }),

      this.prisma.appointment.groupBy({
        by: ['status'],
        where: apptWhere,
        _count: { _all: true },
      }),

      this.prisma.encounter.count({ where: encWhere }),

      this.prisma.prescription.count({
        where: {
          deletedAt: null,
          ...(orgId
            ? { encounter: { organizationId: orgId, deletedAt: null } }
            : { encounter: { deletedAt: null } }),
          ...this.createdAtFilter(from, to),
        },
      }),

      this.prisma.queueEntry.groupBy({
        by: ['status'],
        where: orgId ? { appointment: { organizationId: orgId, deletedAt: null } } : {},
        _count: { _all: true },
      }),
    ]);

    const byApptStatus = this.toStatusMap(apptGroups);
    const byQueueStatus = this.toStatusMap(queueGroups);

    return {
      organizationId: orgId ?? null,
      branchId: branchId ?? null,
      period: { from: from ?? null, to: to ?? null },
      staff: { totalUsers, totalDoctors, activeDoctors },
      patients: { total: totalPatients, active: activePatients },
      appointments: {
        total: totalAppointments,
        today: appointmentsToday,
        upcoming: upcomingAppointments,
        byStatus: byApptStatus,
      },
      queue: {
        total: Object.values(byQueueStatus).reduce((s, n) => s + n, 0),
        byStatus: byQueueStatus,
      },
      encounters: { total: totalEncounters },
      prescriptions: { total: totalPrescriptions },
    };
  }

  async getAppointmentsReport(query: ReportQueryDto, caller: JwtPayload) {
    const ctx = await this.buildContext(query, caller);
    const { orgId, branchId, from, to } = ctx;

    const apptWhere = this.apptWhere(orgId, branchId, from, to);

    const [total, today, upcoming, groups] = await Promise.all([
      this.prisma.appointment.count({ where: apptWhere }),
      this.prisma.appointment.count({
        where: { ...(orgId ? { organizationId: orgId } : {}), deletedAt: null, scheduledAt: { gte: this.startOfToday(), lte: this.endOfToday() } },
      }),
      this.prisma.appointment.count({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          deletedAt: null,
          scheduledAt: { gt: new Date() },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        },
      }),
      this.prisma.appointment.groupBy({ by: ['status'], where: apptWhere, _count: { _all: true } }),
    ]);

    const byStatus = this.toStatusMap(groups);

    return {
      organizationId: orgId ?? null,
      branchId: branchId ?? null,
      period: { from: from ?? null, to: to ?? null },
      total,
      today,
      upcoming,
      completed: byStatus[AppointmentStatus.COMPLETED] ?? 0,
      cancelled: byStatus[AppointmentStatus.CANCELLED] ?? 0,
      noShow: byStatus[AppointmentStatus.NO_SHOW] ?? 0,
      byStatus,
    };
  }

  async getClinicalReport(query: ReportQueryDto, caller: JwtPayload) {
    const ctx = await this.buildContext(query, caller);
    const { orgId, branchId, from, to } = ctx;

    const encWhere = this.encWhere(orgId, branchId, from, to);
    const rxWhere = {
      deletedAt: null,
      ...(orgId
        ? { encounter: { organizationId: orgId, deletedAt: null } }
        : { encounter: { deletedAt: null } }),
      ...this.createdAtFilter(from, to),
    };

    const [
      totalEncounters,
      encountersWithDiagnosis,
      encountersWithTreatmentPlan,
      totalPrescriptions,
      prescriptionsWithRefills,
    ] = await Promise.all([
      this.prisma.encounter.count({ where: encWhere }),
      this.prisma.encounter.count({ where: { ...encWhere, diagnosis: { not: null } } }),
      this.prisma.encounter.count({ where: { ...encWhere, treatmentPlan: { not: null } } }),
      this.prisma.prescription.count({ where: rxWhere }),
      this.prisma.prescription.count({ where: { ...rxWhere, refillsLeft: { gt: 0 } } }),
    ]);

    return {
      organizationId: orgId ?? null,
      branchId: branchId ?? null,
      period: { from: from ?? null, to: to ?? null },
      encounters: {
        total: totalEncounters,
        withDiagnosis: encountersWithDiagnosis,
        withTreatmentPlan: encountersWithTreatmentPlan,
        withoutDiagnosis: totalEncounters - encountersWithDiagnosis,
      },
      prescriptions: {
        total: totalPrescriptions,
        withRefills: prescriptionsWithRefills,
      },
    };
  }

  async getQueueReport(query: ReportQueryDto, caller: JwtPayload) {
    const ctx = await this.buildContext(query, caller);
    const { orgId, from, to } = ctx;

    const queueWhere = {
      ...(orgId ? { appointment: { organizationId: orgId, deletedAt: null } } : {}),
      ...this.createdAtFilter(from, to),
    };

    const groups = await this.prisma.queueEntry.groupBy({
      by: ['status'],
      where: queueWhere,
      _count: { _all: true },
    });

    const byStatus = this.toStatusMap(groups);
    const total = Object.values(byStatus).reduce((s, n) => s + n, 0);

    return {
      organizationId: orgId ?? null,
      period: { from: from ?? null, to: to ?? null },
      total,
      waiting: byStatus[QueueStatus.WAITING] ?? 0,
      called: byStatus[QueueStatus.CALLED] ?? 0,
      inProgress: byStatus[QueueStatus.IN_PROGRESS] ?? 0,
      done: byStatus[QueueStatus.DONE] ?? 0,
      skipped: byStatus[QueueStatus.SKIPPED] ?? 0,
      byStatus,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async buildContext(query: ReportQueryDto, caller: JwtPayload) {
    const orgId = this.resolveOrgId(query, caller);
    if (query.branchId && orgId) {
      await this.assertBranchBelongsToOrg(query.branchId, orgId);
    }
    return { orgId, branchId: query.branchId, from: query.from, to: query.to };
  }

  private resolveOrgId(query: ReportQueryDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (query.organizationId) {
        // Validate org exists
        return query.organizationId;
      }
      return undefined; // all orgs
    }
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access reports for another organization');
    }
    return caller.organizationId;
  }

  private apptWhere(orgId: string | undefined, branchId: string | undefined, from?: string, to?: string) {
    return {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(branchId ? { branchId } : {}),
      deletedAt: null as null,
      ...this.scheduledAtFilter(from, to),
    };
  }

  private encWhere(orgId: string | undefined, branchId: string | undefined, from?: string, to?: string) {
    return {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(branchId ? { branchId } : {}),
      deletedAt: null as null,
      ...this.createdAtFilter(from, to),
    };
  }

  private scheduledAtFilter(from?: string, to?: string) {
    if (!from && !to) return {};
    return {
      scheduledAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
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

  private toStatusMap(groups: Array<{ status: string; _count: { _all: number } }>): Record<string, number> {
    return Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfToday(): Date {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
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
