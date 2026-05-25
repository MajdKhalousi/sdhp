import { Module } from '@nestjs/common';
import { MedicalTimelineService } from './medical-timeline.service';
import { MedicalTimelineController } from './medical-timeline.controller';
import { MedicalTimelineWriterService } from './medical-timeline-writer.service';

@Module({
  controllers: [MedicalTimelineController],
  providers: [MedicalTimelineService, MedicalTimelineWriterService],
  exports: [MedicalTimelineWriterService],
})
export class MedicalTimelineModule {}
