import { Module } from '@nestjs/common';
import { MedicalFilesService } from './medical-files.service';
import { MedicalFilesController, PatientMedicalFilesController } from './medical-files.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [MedicalTimelineModule],
  controllers: [MedicalFilesController, PatientMedicalFilesController],
  providers: [MedicalFilesService],
})
export class MedicalFilesModule {}
