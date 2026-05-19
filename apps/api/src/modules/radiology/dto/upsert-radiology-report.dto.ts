import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertRadiologyReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impression?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}
