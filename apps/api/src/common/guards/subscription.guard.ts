import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';
import { REQUIRES_ACTIVE_SUBSCRIPTION_KEY } from '../decorators/requires-active-subscription.decorator';
import { SubscriptionAccessService } from '../subscription/subscription-access.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionAccess: SubscriptionAccessService,
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

    const resource = context.getClass().name.replace(/Controller$/, '').toLowerCase();
    const resourceId = (request.params as Record<string, string> | undefined)?.id;

    await this.subscriptionAccess.assertWriteAllowed(user, { resource, resourceId });
    return true;
  }
}
