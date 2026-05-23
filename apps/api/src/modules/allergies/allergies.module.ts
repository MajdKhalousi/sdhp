import { Module } from '@nestjs/common';
import { AllergiesService } from './allergies.service';
import { AllergiesController } from './allergies.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [AllergiesController],
  providers: [AllergiesService],
})
export class AllergiesModule {}
