import { ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalFileCategory } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class MedicalFileQueryDto {
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

  @ApiPropertyOptional({ enum: MedicalFileCategory })
  @IsOptional()
  @IsEnum(MedicalFileCategory)
  category?: MedicalFileCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadedById?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
