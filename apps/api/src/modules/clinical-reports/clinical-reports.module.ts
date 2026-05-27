import { Module } from '@nestjs/common';
import { ClinicalReportsService } from './clinical-reports.service';
import { ClinicalReportsController, PatientClinicalReportsController } from './clinical-reports.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';

@Module({
  imports: [MedicalTimelineModule],
  controllers: [ClinicalReportsController, PatientClinicalReportsController],
  providers: [ClinicalReportsService],
})
export class ClinicalReportsModule {}
