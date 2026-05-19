import { Module } from '@nestjs/common';
import { RadiologyService } from './radiology.service';
import { RadiologyController, PatientRadiologyOrdersController } from './radiology.controller';

@Module({
  controllers: [RadiologyController, PatientRadiologyOrdersController],
  providers: [RadiologyService],
})
export class RadiologyModule {}
