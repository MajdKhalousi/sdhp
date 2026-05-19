import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsWriterService } from './audit-logs-writer.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogsWriterService],
  exports: [AuditLogsWriterService],
})
export class AuditLogsModule {}
