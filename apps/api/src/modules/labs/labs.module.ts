import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController, PatientLabOrdersController } from './labs.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [AuditLogsModule, MedicalTimelineModule],
  controllers: [LabsController, PatientLabOrdersController],
  providers: [LabsService],
})
export class LabsModule {}
