import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController, BillingPolicyController, PatientInvoicesController } from './billing.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [BillingController, BillingPolicyController, PatientInvoicesController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
