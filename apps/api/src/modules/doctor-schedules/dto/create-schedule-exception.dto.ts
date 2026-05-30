import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleExceptionType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class CreateScheduleExceptionDto {
  @ApiProperty({ example: '2026-07-04', description: 'Calendar date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ScheduleExceptionType, description: 'HOLIDAY or LEAVE = full day off; CUSTOM_HOURS = override schedule' })
  @IsEnum(ScheduleExceptionType)
  type: ScheduleExceptionType;

  @ApiPropertyOptional({ example: '09:00', description: 'Override start time (HH:MM). Required for CUSTOM_HOURS.' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime?: string;

  @ApiPropertyOptional({ example: '13:00', description: 'Override end time (HH:MM). Required for CUSTOM_HOURS.' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime?: string;

  @ApiPropertyOptional({ example: 'National holiday' })
  @IsOptional()
  @IsString()
  reason?: string;
}
