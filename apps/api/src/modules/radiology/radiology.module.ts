import { Module } from '@nestjs/common';
import { RadiologyService } from './radiology.service';
import { RadiologyController, PatientRadiologyOrdersController } from './radiology.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [AuditLogsModule, MedicalTimelineModule],
  controllers: [RadiologyController, PatientRadiologyOrdersController],
  providers: [RadiologyService],
})
export class RadiologyModule {}
