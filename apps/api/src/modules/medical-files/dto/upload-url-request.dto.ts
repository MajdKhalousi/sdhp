import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalFileCategory } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  sizeBytes: number;

  @ApiProperty({ enum: MedicalFileCategory, example: MedicalFileCategory.LAB_RESULT })
  @IsEnum(MedicalFileCategory)
  category: MedicalFileCategory;

  @ApiPropertyOptional({ example: 'Annual chest X-ray' })
  @IsOptional()
  @IsString()
  description?: string;
}
