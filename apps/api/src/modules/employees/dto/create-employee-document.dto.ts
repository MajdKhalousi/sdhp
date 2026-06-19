import { ApiProperty } from '@nestjs/swagger';
import { EmployeeDocumentCategory } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export const ALLOWED_EMPLOYEE_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_EMPLOYEE_DOCUMENT_SIZE_BYTES = 10_485_760; // 10 MB

export class CreateEmployeeDocumentDto {
  @ApiProperty({ enum: EmployeeDocumentCategory, example: EmployeeDocumentCategory.ID_DOCUMENT })
  @IsEnum(EmployeeDocumentCategory)
  category: EmployeeDocumentCategory;

  @ApiProperty({ example: 'national-id-front.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg', enum: ALLOWED_EMPLOYEE_DOCUMENT_MIME_TYPES })
  @IsIn(ALLOWED_EMPLOYEE_DOCUMENT_MIME_TYPES, { message: 'Unsupported employee document type' })
  mimeType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  @Max(MAX_EMPLOYEE_DOCUMENT_SIZE_BYTES, { message: 'Employee document size exceeds 10MB limit' })
  sizeBytes: number;

  @ApiProperty({ example: 'org-001/employee-profile-cuid/uuid.jpg' })
  @IsString()
  storageKey: string;
}
