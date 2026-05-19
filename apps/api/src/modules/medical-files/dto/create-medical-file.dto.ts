import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalFileCategory } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMedicalFileDto {
  @ApiPropertyOptional({ example: 'org-cuid-123' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ example: 'patient-cuid-123' })
  @IsString()
  patientId: string;

  @ApiPropertyOptional({ example: 'encounter-cuid-123' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiProperty({ enum: MedicalFileCategory, example: MedicalFileCategory.LAB_RESULT })
  @IsEnum(MedicalFileCategory)
  category: MedicalFileCategory;

  @ApiProperty({ example: 'chest-xray-2026-01-15.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  sizeBytes: number;

  @ApiProperty({ example: 'org-001/patients/pat-123/uuid.pdf' })
  @IsString()
  storageKey: string;

  @ApiPropertyOptional({ example: 'Annual chest X-ray' })
  @IsOptional()
  @IsString()
  description?: string;
}
