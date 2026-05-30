import { Module } from '@nestjs/common';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedulesController } from './doctor-schedules.controller';

@Module({
  controllers: [DoctorSchedulesController],
  providers: [DoctorSchedulesService],
  exports: [DoctorSchedulesService],
})
export class DoctorSchedulesModule {}
