import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

// ── Select constants ───────────────────────────────────────────────────────

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
} as const;

const LOG_SELECT = {
  id: true,
  userId: true,
  organizationId: true,
  action: true,
  resource: true,
  resourceId: true,
  oldData: true,
  newData: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  user: { select: USER_SELECT },
} as const;

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: AuditLogQueryDto, _caller: JwtPayload): Promise<PaginatedResponse<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...this.createdAtFilter(query.from, query.to),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: LOG_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, _caller: JwtPayload) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      select: LOG_SELECT,
    });
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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
