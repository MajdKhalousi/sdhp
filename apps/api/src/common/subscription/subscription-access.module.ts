import { Module } from '@nestjs/common';
import { SubscriptionAccessService } from './subscription-access.service';
import { AuditLogsModule } from '../../modules/audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [SubscriptionAccessService],
  exports: [SubscriptionAccessService],
})
export class SubscriptionAccessModule {}
