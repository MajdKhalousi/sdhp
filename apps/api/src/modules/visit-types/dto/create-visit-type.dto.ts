import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitTypeCode } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateVisitTypeDto {
  @ApiProperty({ example: 'Consultation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'استشارة' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiProperty({ enum: VisitTypeCode, example: VisitTypeCode.CONSULTATION })
  @IsEnum(VisitTypeCode)
  code: VisitTypeCode;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color for calendar display' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #3B82F6)' })
  color?: string;

  @ApiProperty({ example: 20, description: 'Appointment duration in minutes' })
  @IsInt()
  @Min(5)
  durationMinutes: number;

  @ApiPropertyOptional({ example: 50.0, description: 'Base price; omit or null for no default price' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number;
}
