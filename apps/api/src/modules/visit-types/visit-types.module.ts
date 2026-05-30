import { Module } from '@nestjs/common';
import { VisitTypesService } from './visit-types.service';
import { VisitTypesController } from './visit-types.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [VisitTypesController],
  providers: [VisitTypesService],
  exports: [VisitTypesService],
})
export class VisitTypesModule {}
