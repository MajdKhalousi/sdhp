import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class AvailableSlotsQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'Date to query slots for (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 20, description: 'Slot duration in minutes (defaults to clinic defaultSlotMin or 20)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Type(() => Number)
  slotDurationMin?: number;
}
