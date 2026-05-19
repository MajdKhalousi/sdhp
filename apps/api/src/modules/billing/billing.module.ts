import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController, PatientInvoicesController } from './billing.controller';

@Module({
  controllers: [BillingController, PatientInvoicesController],
  providers: [BillingService],
})
export class BillingModule {}
