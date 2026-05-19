import { Module } from '@nestjs/common';
import { MedicalFilesService } from './medical-files.service';
import { MedicalFilesController, PatientMedicalFilesController } from './medical-files.controller';

@Module({
  controllers: [MedicalFilesController, PatientMedicalFilesController],
  providers: [MedicalFilesService],
})
export class MedicalFilesModule {}
