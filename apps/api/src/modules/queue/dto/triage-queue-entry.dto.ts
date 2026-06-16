import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class TriageQueueEntryDto {
  @ApiPropertyOptional({
    description:
      'Vitals recorded by nurse before encounter. Same shape as Encounter.vitals ' +
      '(temperature, bloodPressure, heartRate, oxygenSaturation, respiratoryRate, weight, height — all optional strings).',
    example: {
      temperature: '37.2',
      bloodPressure: '120/80',
      heartRate: '72',
      oxygenSaturation: '98',
    },
  })
  @IsOptional()
  @IsObject()
  triageVitals?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Chief complaint draft written by nurse during triage. Prefills encounter chief complaint.',
    example: 'Patient presents with acute abdominal pain since this morning',
  })
  @IsOptional()
  @IsString()
  chiefComplaintDraft?: string;
}
