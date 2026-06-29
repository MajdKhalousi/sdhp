import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { CreatePrescriptionTemplateDto } from './dto/create-prescription-template.dto';
import { UpdatePrescriptionTemplateDto } from './dto/update-prescription-template.dto';

const ITEM_SELECT = {
  id: true,
  medication: true,
  dosage: true,
  frequency: true,
  duration: true,
  instructions: true,
  quantity: true,
  refillsLeft: true,
} as const;

const SELECT = {
  id: true,
  organizationId: true,
  name: true,
  nameAr: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  items: { select: ITEM_SELECT, orderBy: { id: 'asc' as const } },
} as const;

@Injectable()
export class PrescriptionTemplatesService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(caller: JwtPayload, includeInactive = false) {
    // DOCTOR never sees inactive templates, even if includeInactive is passed —
    // only ORG_ADMIN/SUPER_ADMIN manage template lifecycle and need that view.
    const honorIncludeInactive = caller.role !== UserRole.DOCTOR && includeInactive;
    return this.prisma.prescriptionTemplate.findMany({
      where: {
        organizationId: caller.organizationId,
        deletedAt: null,
        ...(honorIncludeInactive ? {} : { isActive: true }),
      },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const template = await this.resolveTemplate(id, caller.organizationId);
    // DOCTOR can only ever apply active templates — direct-by-id access to an
    // inactive one is treated the same as not found. ORG_ADMIN/SUPER_ADMIN can
    // still read inactive templates here for management/reactivation.
    if (caller.role === UserRole.DOCTOR && !template.isActive) {
      throw new NotFoundException('Prescription template not found');
    }
    return template;
  }

  async create(dto: CreatePrescriptionTemplateDto, caller: JwtPayload) {
    this.assertAdmin(caller);

    const result = await this.prisma.prescriptionTemplate.create({
      data: {
        organizationId: caller.organizationId,
        name: dto.name,
        nameAr: dto.nameAr,
        isActive: dto.isActive ?? true,
        items: { createMany: { data: dto.items } },
      },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'CREATE',
      resource: 'prescription_template',
      resourceId: result.id,
      newData: toSnapshot({ id: result.id, name: result.name, itemCount: result.items.length }),
    });

    return result;
  }

  async update(id: string, dto: UpdatePrescriptionTemplateDto, caller: JwtPayload) {
    this.assertAdmin(caller);
    const existing = await this.resolveTemplate(id, caller.organizationId);

    const { items, ...fields } = dto;

    const result = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.prescriptionTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.prescriptionTemplateItem.createMany({
          data: items.map((item) => ({ ...item, templateId: id })),
        });
      }

      return tx.prescriptionTemplate.update({
        where: { id },
        data: fields,
        select: SELECT,
      });
    });

    await this.auditWriter.log({
      caller,
      action: 'UPDATE',
      resource: 'prescription_template',
      resourceId: id,
      oldData: toSnapshot({ name: existing.name, itemCount: existing.items.length }),
      newData: toSnapshot({ name: result.name, itemCount: result.items.length }),
    });

    return result;
  }

  async remove(id: string, caller: JwtPayload) {
    this.assertAdmin(caller);
    const existing = await this.resolveTemplate(id, caller.organizationId);

    await this.prisma.prescriptionTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditWriter.log({
      caller,
      action: 'SOFT_DELETE',
      resource: 'prescription_template',
      resourceId: id,
      oldData: toSnapshot({ name: existing.name }),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveTemplate(id: string, organizationId: string) {
    const template = await this.prisma.prescriptionTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: SELECT,
    });
    if (!template) throw new NotFoundException('Prescription template not found');
    return template;
  }

  private assertAdmin(caller: JwtPayload): void {
    if (caller.role !== UserRole.ORG_ADMIN && caller.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ORG_ADMIN can manage prescription templates');
    }
  }
}
