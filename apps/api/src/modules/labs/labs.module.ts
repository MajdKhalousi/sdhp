import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController, PatientLabOrdersController } from './labs.controller';

@Module({
  controllers: [LabsController, PatientLabOrdersController],
  providers: [LabsService],
})
export class LabsModule {}
