import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [EncountersController],
  providers: [EncountersService],
})
export class EncountersModule {}
