import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertLabResultDto {
  @ApiPropertyOptional({ example: '5.8' })
  @IsOptional()
  @IsString()
  resultValue?: string;

  @ApiPropertyOptional({ example: 'g/dL' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '4.0-5.5' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  interpretation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultNotes?: string;

  @ApiPropertyOptional({ example: '2026-05-19T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  resultAt?: string;
}
