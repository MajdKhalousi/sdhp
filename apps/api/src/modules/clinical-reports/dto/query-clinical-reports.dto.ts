import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClinicalReportStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryClinicalReportsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ enum: ClinicalReportStatus })
  @IsOptional()
  @IsEnum(ClinicalReportStatus)
  status?: ClinicalReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;
}
