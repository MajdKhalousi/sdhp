import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';

@Module({
  controllers: [EncountersController],
  providers: [EncountersService],
})
export class EncountersModule {}
