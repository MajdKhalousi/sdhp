import { Module } from '@nestjs/common';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { SubscriptionPaymentsController } from './subscription-payments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [SubscriptionPaymentsController],
  providers: [SubscriptionPaymentsService],
})
export class SubscriptionPaymentsModule {}
