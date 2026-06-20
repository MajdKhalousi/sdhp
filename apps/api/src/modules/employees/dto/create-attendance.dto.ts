import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({ example: '2026-01-15', description: 'Calendar date — normalized to midnight UTC server-side' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: '2026-01-15T08:02:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15T16:05:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @ApiPropertyOptional({ example: 'Arrived late due to traffic' })
  @IsOptional()
  @IsString()
  notes?: string;
}
