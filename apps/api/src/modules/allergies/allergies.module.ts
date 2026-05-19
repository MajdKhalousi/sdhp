import { Module } from '@nestjs/common';
import { AllergiesService } from './allergies.service';
import { AllergiesController } from './allergies.controller';

@Module({
  controllers: [AllergiesController],
  providers: [AllergiesService],
})
export class AllergiesModule {}
