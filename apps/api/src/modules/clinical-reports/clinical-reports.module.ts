import { Module } from '@nestjs/common';
import { ClinicalReportsService } from './clinical-reports.service';
import { ClinicalReportsController, PatientClinicalReportsController } from './clinical-reports.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [MedicalTimelineModule, PdfModule, StorageModule],
  controllers: [ClinicalReportsController, PatientClinicalReportsController],
  providers: [ClinicalReportsService],
})
export class ClinicalReportsModule {}
