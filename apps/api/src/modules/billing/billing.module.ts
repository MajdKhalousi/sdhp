import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController, PatientInvoicesController } from './billing.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [BillingController, PatientInvoicesController],
  providers: [BillingService],
})
export class BillingModule {}
