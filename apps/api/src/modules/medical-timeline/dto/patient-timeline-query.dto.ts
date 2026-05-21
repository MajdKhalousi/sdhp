import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TimelineEventType } from '../../../common/types/timeline-event.type';

export class PatientTimelineQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TimelineEventType,
    isArray: true,
    description: 'Filter to specific event types. Omit to return all types.',
  })
  @IsOptional()
  @IsEnum(TimelineEventType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value !== undefined ? [value] : undefined))
  types?: TimelineEventType[];

  @ApiPropertyOptional({ description: 'Return events at or after this date (ISO 8601)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Return events at or before this date (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
