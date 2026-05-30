import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'ECG' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'تخطيط القلب الكهربائي' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiProperty({ example: 'ECG', description: 'Unique code within the organization (uppercase, no spaces)' })
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, { message: 'code must be uppercase letters, digits, underscores, or hyphens' })
  code: string;

  @ApiPropertyOptional({ example: 'seed-dept-001', description: 'Department ID (optional)' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: 25.0, description: 'Default price for this service' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultPrice: number;
}
