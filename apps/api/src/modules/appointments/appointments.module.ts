import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [MedicalTimelineModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
