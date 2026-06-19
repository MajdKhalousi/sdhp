import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsWriterService } from '../../modules/audit-logs/audit-logs-writer.service';
import { JwtPayload } from '../types/jwt-payload.type';
import { REQUIRES_ACTIVE_SUBSCRIPTION_KEY } from '../decorators/requires-active-subscription.decorator';
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

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresActiveSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_ACTIVE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiresActiveSubscription) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    // No user attached — not this guard's concern; JwtAuthGuard already
    // handles missing/invalid auth and runs before this guard.
    if (!user) return true;

    if (user.role === UserRole.SUPER_ADMIN) return true;

    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, isActive: true, subscriptionStatus: true, subscriptionEndAt: true },
    });

    if (!organization || this.isBlocked(organization)) {
      await this.logBlocked(context, user, request);
      throw new ForbiddenException({
        statusCode: 403,
        code: SUBSCRIPTION_WRITE_BLOCKED_CODE,
        message: SUBSCRIPTION_WRITE_BLOCKED_MESSAGE,
      });
    }

    return true;
  }

  // Explicit status always wins over subscriptionEndAt — an EXPIRED org with
  // a future end date is still EXPIRED (grace is computed from the date only
  // to decide how long EXPIRED has been tolerated, never to override status).
  private isBlocked(org: OrganizationSubscriptionFields): boolean {
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

  private async logBlocked(context: ExecutionContext, user: JwtPayload, request: Request): Promise<void> {
    try {
      const resource = context.getClass().name.replace(/Controller$/, '').toLowerCase();
      const resourceId = (request.params as Record<string, string> | undefined)?.id;
      await this.auditWriter.log({
        caller: user,
        action: 'SUBSCRIPTION_WRITE_BLOCKED',
        resource,
        resourceId,
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
