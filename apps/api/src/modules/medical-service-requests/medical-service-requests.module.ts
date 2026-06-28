import { Module } from '@nestjs/common';
import { MedicalServiceRequestsService } from './medical-service-requests.service';
import { MedicalServiceRequestsController } from './medical-service-requests.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [MedicalServiceRequestsController],
  providers: [MedicalServiceRequestsService],
  exports: [MedicalServiceRequestsService],
})
export class MedicalServiceRequestsModule {}
