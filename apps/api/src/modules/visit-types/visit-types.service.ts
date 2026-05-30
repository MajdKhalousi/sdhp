import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { CreateVisitTypeDto } from './dto/create-visit-type.dto';
import { UpdateVisitTypeDto } from './dto/update-visit-type.dto';

const SELECT = {
  id: true,
  organizationId: true,
  name: true,
  nameAr: true,
  code: true,
  color: true,
  durationMinutes: true,
  basePrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class VisitTypesService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(caller: JwtPayload, includeInactive = false) {
    return this.prisma.visitType.findMany({
      where: {
        organizationId: caller.organizationId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateVisitTypeDto, caller: JwtPayload) {
    this.assertAdmin(caller);
    const existing = await this.prisma.visitType.findFirst({
      where: { organizationId: caller.organizationId, code: dto.code, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Visit type with code ${dto.code} already exists`);
    }

    const result = await this.prisma.visitType.create({
      data: { ...dto, organizationId: caller.organizationId },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'CREATE',
      resource: 'visit_type',
      resourceId: result.id,
      newData: toSnapshot({ id: result.id, name: result.name, code: result.code, durationMinutes: result.durationMinutes }),
    });

    return result;
  }

  async update(id: string, dto: UpdateVisitTypeDto, caller: JwtPayload) {
    this.assertAdmin(caller);
    const vt = await this.resolveVisitType(id, caller.organizationId);

    const result = await this.prisma.visitType.update({
      where: { id },
      data: dto,
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'UPDATE',
      resource: 'visit_type',
      resourceId: id,
      oldData: toSnapshot({ name: vt.name, durationMinutes: vt.durationMinutes, isActive: vt.isActive }),
      newData: toSnapshot(dto as Record<string, unknown>),
    });

    return result;
  }

  async remove(id: string, caller: JwtPayload) {
    this.assertAdmin(caller);
    const vt = await this.resolveVisitType(id, caller.organizationId);

    await this.prisma.visitType.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditWriter.log({
      caller,
      action: 'SOFT_DELETE',
      resource: 'visit_type',
      resourceId: id,
      oldData: toSnapshot({ name: vt.name, code: vt.code }),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveVisitType(id: string, organizationId: string) {
    const vt = await this.prisma.visitType.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: SELECT,
    });
    if (!vt) throw new NotFoundException('Visit type not found');
    return vt;
  }

  private assertAdmin(caller: JwtPayload): void {
    if (caller.role !== UserRole.ORG_ADMIN && caller.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ORG_ADMIN can manage visit types');
    }
  }
}
