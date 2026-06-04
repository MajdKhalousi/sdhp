import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateEncounterDto {
  @ApiProperty({ example: 'patient-cuid' })
  @IsString()
  patientId: string;

  @ApiProperty({
    example: 'doctor-cuid',
    description: 'For DOCTOR callers, this is auto-resolved from their profile and must not differ.',
  })
  @IsString()
  doctorId: string;

  @ApiPropertyOptional({ example: 'appointment-cuid' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Chest pain for 2 days' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ example: '3-day history of worsening headache. Onset gradual. Worse at night. No fever.' })
  @IsOptional()
  @IsString()
  historyOfPresentIllness?: string;

  @ApiPropertyOptional({ example: 'Patient appears comfortable at rest' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Stable angina' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'I20.9' })
  @IsOptional()
  @IsString()
  diagnosisCode?: string;

  @ApiPropertyOptional({ example: 'Aspirin 100mg daily, follow-up in 4 weeks' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ example: 'Rest for 2 days, increase fluid intake, return if fever exceeds 39°C.' })
  @IsOptional()
  @IsString()
  patientInstructions?: string;

  @ApiPropertyOptional({ example: '2026-07-15T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({
    example: { bp: '120/80', hr: 72, temp: 36.6, weight: 75 },
    description: 'Free-form JSON for vital signs',
  })
  @IsOptional()
  @IsObject()
  vitals?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-06-10T09:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN. Ignored for ORG_ADMIN/DOCTOR — their org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
