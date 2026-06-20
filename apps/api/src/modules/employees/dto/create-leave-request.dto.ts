import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty({ enum: LeaveType, example: LeaveType.ANNUAL })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ example: '2026-02-01', description: 'Calendar date — normalized to midnight UTC server-side' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-02-05', description: 'Calendar date — normalized to midnight UTC server-side' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Family travel' })
  @IsOptional()
  @IsString()
  reason?: string;
}
