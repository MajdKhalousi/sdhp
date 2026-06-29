import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class PrescriptionTemplateItemDto {
  @ApiProperty({ example: 'Amoxicillin 500mg' })
  @IsString()
  @IsNotEmpty()
  medication: string;

  @ApiPropertyOptional({ example: '500mg' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ example: 'Three times daily' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ example: '7 days' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ example: 'Take with food' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ example: 21 })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  refillsLeft?: number;
}
