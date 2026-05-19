import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

interface AuditLogInput {
  caller: JwtPayload;
  action: string;
  resource: string;
  resourceId?: string;
  newData?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditLogsWriterService {
  private readonly logger = new Logger(AuditLogsWriterService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.caller.sub,
          organizationId: input.caller.organizationId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          newData: input.newData ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(
        `Audit log write failed — action=${input.action} resource=${input.resource} resourceId=${input.resourceId}`,
        err instanceof Error ? err.stack : String(err),
      );
      // never rethrow — primary operation must not be disrupted
    }
  }
}
