import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [AuditLogsModule, MedicalTimelineModule],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
