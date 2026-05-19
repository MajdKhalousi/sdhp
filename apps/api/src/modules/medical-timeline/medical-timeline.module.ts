import { Module } from '@nestjs/common';
import { MedicalTimelineService } from './medical-timeline.service';
import { MedicalTimelineController } from './medical-timeline.controller';

@Module({
  controllers: [MedicalTimelineController],
  providers: [MedicalTimelineService],
})
export class MedicalTimelineModule {}
