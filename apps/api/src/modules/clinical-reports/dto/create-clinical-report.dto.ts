import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClinicalReportStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClinicalReportDto {
  @ApiProperty({ example: 'patient-cuid-123' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'encounter-cuid-123' })
  @IsString()
  encounterId: string;

  @ApiProperty({ example: 'Discharge Summary' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'Patient presented with chest pain...' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ enum: ClinicalReportStatus, default: ClinicalReportStatus.DRAFT })
  @IsOptional()
  @IsEnum(ClinicalReportStatus)
  status?: ClinicalReportStatus;
}
