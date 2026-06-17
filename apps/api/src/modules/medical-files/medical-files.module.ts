import { Module } from '@nestjs/common';
import { MedicalFilesService } from './medical-files.service';
import { MedicalFilesController, PatientMedicalFilesController } from './medical-files.controller';
import { MedicalTimelineModule } from '../medical-timeline/medical-timeline.module';
import { StorageModule } from '../storage/storage.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [MedicalTimelineModule, StorageModule, AuditLogsModule],
  controllers: [MedicalFilesController, PatientMedicalFilesController],
  providers: [MedicalFilesService],
})
export class MedicalFilesModule {}
