import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleDayItemDto {
  @ApiProperty({ example: 0, description: '0=Sunday … 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @ApiProperty({ example: '16:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertDoctorScheduleDto {
  @ApiProperty({
    type: [ScheduleDayItemDto],
    description: '0–7 day entries; atomically replaces all existing schedule records. Pass [] to clear.',
  })
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayItemDto)
  days: ScheduleDayItemDto[];
}
