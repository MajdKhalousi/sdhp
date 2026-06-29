import { Module } from '@nestjs/common';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { PrescriptionTemplatesController } from './prescription-templates.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [PrescriptionTemplatesController],
  providers: [PrescriptionTemplatesService],
  exports: [PrescriptionTemplatesService],
})
export class PrescriptionTemplatesModule {}
