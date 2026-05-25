import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [AuditLogsModule, MedicalTimelineModule],
  controllers: [EncountersController],
  providers: [EncountersService],
})
export class EncountersModule {}
