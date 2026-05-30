import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';

const SELECT = {
  id: true,
  organizationId: true,
  name: true,
  nameAr: true,
  code: true,
  departmentId: true,
  defaultPrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
} as const;

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(caller: JwtPayload, query: ServiceQueryDto) {
    return this.prisma.service.findMany({
      where: {
        organizationId: caller.organizationId,
        deletedAt: null,
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      },
      select: SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateServiceDto, caller: JwtPayload) {
    this.assertAdmin(caller);

    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrg(dto.departmentId, caller.organizationId);
    }

    const existing = await this.prisma.service.findFirst({
      where: { organizationId: caller.organizationId, code: dto.code, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Service with code ${dto.code} already exists`);
    }

    const result = await this.prisma.service.create({
      data: { ...dto, organizationId: caller.organizationId },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'CREATE',
      resource: 'service',
      resourceId: result.id,
      newData: toSnapshot({ id: result.id, name: result.name, code: result.code, defaultPrice: result.defaultPrice.toString() }),
    });

    return result;
  }

  async update(id: string, dto: UpdateServiceDto, caller: JwtPayload) {
    this.assertAdmin(caller);
    const svc = await this.resolveService(id, caller.organizationId);

    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrg(dto.departmentId, caller.organizationId);
    }

    const result = await this.prisma.service.update({
      where: { id },
      data: dto,
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'UPDATE',
      resource: 'service',
      resourceId: id,
      oldData: toSnapshot({ name: svc.name, defaultPrice: svc.defaultPrice.toString(), isActive: svc.isActive }),
      newData: toSnapshot(dto as Record<string, unknown>),
    });

    return result;
  }

  async remove(id: string, caller: JwtPayload) {
    this.assertAdmin(caller);
    const svc = await this.resolveService(id, caller.organizationId);

    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditWriter.log({
      caller,
      action: 'SOFT_DELETE',
      resource: 'service',
      resourceId: id,
      oldData: toSnapshot({ name: svc.name, code: svc.code }),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveService(id: string, organizationId: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: SELECT,
    });
    if (!svc) throw new NotFoundException('Service not found');
    return svc;
  }

  private async assertDepartmentBelongsToOrg(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!dept) {
      throw new BadRequestException('Department not found or does not belong to this organization');
    }
  }

  private assertAdmin(caller: JwtPayload): void {
    if (caller.role !== UserRole.ORG_ADMIN && caller.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ORG_ADMIN can manage services');
    }
  }
}
