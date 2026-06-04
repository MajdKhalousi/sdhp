import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateLabOrderDto {
  @ApiPropertyOptional({ description: 'SUPER_ADMIN only — target organization. Auto-derived from patient if omitted.' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'patient-cuid' })
  @IsString()
  patientId: string;

  @ApiPropertyOptional({ example: 'encounter-cuid' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN and ORG_ADMIN. Auto-resolved from caller profile for DOCTOR.',
    example: 'doctor-cuid',
  })
  @IsOptional()
  @IsString()
  orderedById?: string;

  @ApiProperty({ example: 'Complete Blood Count' })
  @IsString()
  testName: string;

  @ApiPropertyOptional({ example: 'CBC' })
  @IsOptional()
  @IsString()
  testCode?: string;

  @ApiPropertyOptional({ example: 'ROUTINE', description: 'Free text: ROUTINE, URGENT, STAT' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
