import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [MedicalTimelineModule, AuditLogsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
