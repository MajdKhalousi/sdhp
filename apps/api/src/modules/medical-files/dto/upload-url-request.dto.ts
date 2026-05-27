import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalFileCategory } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ALLOWED_MIME_TYPES } from './create-medical-file.dto';

const MAX_FILE_SIZE_BYTES = 26_214_400; // 25 MB

export class UploadUrlRequestDto {
  @ApiProperty({ example: 'patient-cuid-123' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ example: 'encounter-cuid-123' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiProperty({ example: 'chest-xray-2026-01-15.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'application/pdf', enum: ALLOWED_MIME_TYPES })
  @IsIn(ALLOWED_MIME_TYPES, { message: 'Unsupported medical file type' })
  mimeType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES, { message: 'Medical file size exceeds 25MB limit' })
  sizeBytes: number;

  @ApiProperty({ enum: MedicalFileCategory, example: MedicalFileCategory.LAB_RESULT })
  @IsEnum(MedicalFileCategory)
  category: MedicalFileCategory;

  @ApiPropertyOptional({ example: 'Annual chest X-ray' })
  @IsOptional()
  @IsString()
  description?: string;
}
