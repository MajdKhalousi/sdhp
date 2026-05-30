import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpsertClinicSettingsDto {
  @ApiPropertyOptional({ example: 20, description: 'Default appointment slot duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  defaultSlotMin?: number;

  @ApiPropertyOptional({ example: '13:30', description: 'Lunch break start time (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'lunchStartTime must be in HH:MM format' })
  lunchStartTime?: string;

  @ApiPropertyOptional({ example: '14:30', description: 'Lunch break end time (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'lunchEndTime must be in HH:MM format' })
  lunchEndTime?: string;

  @ApiPropertyOptional({ example: 'Asia/Damascus' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
