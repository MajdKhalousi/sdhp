import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsWriterService } from '../../modules/audit-logs/audit-logs-writer.service';
import { JwtPayload } from '../types/jwt-payload.type';
import {
  SUBSCRIPTION_GRACE_PERIOD_DAYS,
  SUBSCRIPTION_WRITE_BLOCKED_CODE,
  SUBSCRIPTION_WRITE_BLOCKED_MESSAGE,
} from '../constants/subscription.constants';

const MS_PER_DAY = 86_400_000;

interface OrganizationSubscriptionFields {
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndAt: Date | null;
}

export interface SubscriptionAuditContext {
  resource: string;
  resourceId?: string;
}

@Injectable()
export class SubscriptionAccessService {
  private readonly logger = new Logger(SubscriptionAccessService.name);

  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  // Explicit status always wins over subscriptionEndAt — an EXPIRED org with
  // a future end date is still EXPIRED (grace is computed from the date only
  // to decide how long EXPIRED has been tolerated, never to override status).
  isBlocked(org: OrganizationSubscriptionFields): boolean {
    if (org.isActive === false) return true;
    if (org.subscriptionStatus === SubscriptionStatus.SUSPENDED) return true;
    if (org.subscriptionStatus === SubscriptionStatus.CANCELLED) return true;
    if (org.subscriptionStatus === SubscriptionStatus.EXPIRED) {
      if (!org.subscriptionEndAt) return true; // no anchor to extend grace from — fail closed
      const daysSinceExpiry = Math.floor((Date.now() - org.subscriptionEndAt.getTime()) / MS_PER_DAY);
      return daysSinceExpiry > SUBSCRIPTION_GRACE_PERIOD_DAYS;
    }
    return false; // ACTIVE, TRIAL
  }

  async assertWriteAllowed(caller: JwtPayload, context: SubscriptionAuditContext): Promise<void> {
    if (caller.role === UserRole.SUPER_ADMIN) return;

    const organization = await this.prisma.organization.findUnique({
      where: { id: caller.organizationId },
      select: { id: true, isActive: true, subscriptionStatus: true, subscriptionEndAt: true },
    });

    if (!organization || this.isBlocked(organization)) {
      await this.logBlocked(caller, context);
      throw new ForbiddenException({
        statusCode: 403,
        code: SUBSCRIPTION_WRITE_BLOCKED_CODE,
        message: SUBSCRIPTION_WRITE_BLOCKED_MESSAGE,
      });
    }
  }

  private async logBlocked(caller: JwtPayload, context: SubscriptionAuditContext): Promise<void> {
    try {
      await this.auditWriter.log({
        caller,
        action: 'SUBSCRIPTION_WRITE_BLOCKED',
        resource: context.resource,
        resourceId: context.resourceId,
      });
    } catch (err) {
      // Audit logging must never break the 403 response — AuditLogsWriterService
      // already swallows its own errors, this is a defensive second layer.
      this.logger.error(
        'Failed to write SUBSCRIPTION_WRITE_BLOCKED audit log',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
