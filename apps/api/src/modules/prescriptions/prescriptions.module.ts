import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [MedicalTimelineModule, AuditLogsModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
