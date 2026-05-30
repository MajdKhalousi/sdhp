import { Module } from '@nestjs/common';
import { ClinicSettingsService } from './clinic-settings.service';
import { ClinicSettingsController } from './clinic-settings.controller';

@Module({
  controllers: [ClinicSettingsController],
  providers: [ClinicSettingsService],
  exports: [ClinicSettingsService],
})
export class ClinicSettingsModule {}
