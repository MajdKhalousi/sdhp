import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

interface AuditLogInput {
  caller: JwtPayload;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Prisma.InputJsonObject;
  newData?: Prisma.InputJsonObject;
}

/**
 * Converts any serializable record into a safe audit snapshot.
 * Dates become ISO strings via JSON.stringify; circular refs are dropped.
 * Never call with objects that contain passwords or tokens.
 */
export function toSnapshot(data: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonObject;
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
          oldData: input.oldData ?? undefined,
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
