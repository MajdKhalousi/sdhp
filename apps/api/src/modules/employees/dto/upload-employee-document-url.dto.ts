import { ApiProperty } from '@nestjs/swagger';
import { EmployeeDocumentCategory } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import {
  ALLOWED_EMPLOYEE_DOCUMENT_MIME_TYPES,
  MAX_EMPLOYEE_DOCUMENT_SIZE_BYTES,
} from './create-employee-document.dto';

export class UploadEmployeeDocumentUrlDto {
  @ApiProperty({ example: 'national-id-front.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg', enum: ALLOWED_EMPLOYEE_DOCUMENT_MIME_TYPES })
  @IsIn(ALLOWED_EMPLOYEE_DOCUMENT_MIME_TYPES, { message: 'Unsupported employee document type' })
  mimeType: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  @Max(MAX_EMPLOYEE_DOCUMENT_SIZE_BYTES, { message: 'Employee document size exceeds 10MB limit' })
  sizeBytes: number;

  @ApiProperty({ enum: EmployeeDocumentCategory, example: EmployeeDocumentCategory.ID_DOCUMENT })
  @IsEnum(EmployeeDocumentCategory)
  category: EmployeeDocumentCategory;
}
