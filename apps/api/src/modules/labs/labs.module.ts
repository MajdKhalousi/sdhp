import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController, PatientLabOrdersController } from './labs.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [LabsController, PatientLabOrdersController],
  providers: [LabsService],
})
export class LabsModule {}
