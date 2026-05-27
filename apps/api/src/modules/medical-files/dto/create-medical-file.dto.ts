import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalFileCategory } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/dicom',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const MAX_FILE_SIZE_BYTES = 26_214_400; // 25 MB

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

  @ApiProperty({ example: 'application/pdf', enum: ALLOWED_MIME_TYPES })
  @IsIn(ALLOWED_MIME_TYPES, { message: 'Unsupported medical file type' })
  mimeType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES, { message: 'Medical file size exceeds 25MB limit' })
  sizeBytes: number;

  @ApiProperty({ example: 'org-001/patients/pat-123/uuid.pdf' })
  @IsString()
  storageKey: string;

  @ApiPropertyOptional({ example: 'Annual chest X-ray' })
  @IsOptional()
  @IsString()
  description?: string;
}
