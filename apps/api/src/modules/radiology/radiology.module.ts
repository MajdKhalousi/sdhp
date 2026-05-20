import { Module } from '@nestjs/common';
import { RadiologyService } from './radiology.service';
import { RadiologyController, PatientRadiologyOrdersController } from './radiology.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [RadiologyController, PatientRadiologyOrdersController],
  providers: [RadiologyService],
})
export class RadiologyModule {}
