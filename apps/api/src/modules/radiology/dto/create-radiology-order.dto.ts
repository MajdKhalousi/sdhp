import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRadiologyOrderDto {
  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderedById?: string;

  @ApiProperty({ example: 'X-RAY' })
  @IsString()
  modality: string;

  @ApiPropertyOptional({ example: 'CHEST' })
  @IsOptional()
  @IsString()
  bodyPart?: string;

  @ApiPropertyOptional({ example: 'Suspected pneumonia' })
  @IsOptional()
  @IsString()
  clinicalInfo?: string;

  @ApiPropertyOptional({ example: 'ROUTINE' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
