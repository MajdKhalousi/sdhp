import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderStatus } from '@prisma/client';

const UPDATABLE_STATUSES = {
  SENT:   ReminderStatus.SENT,
  FAILED: ReminderStatus.FAILED,
} as const;

type UpdatableStatus = typeof UPDATABLE_STATUSES[keyof typeof UPDATABLE_STATUSES];

export class UpdateReminderDto {
  @IsEnum(UPDATABLE_STATUSES)
  @ApiProperty({ enum: Object.values(UPDATABLE_STATUSES) })
  status: UpdatableStatus;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  failureReason?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional note recorded during the contact attempt' })
  contactNote?: string;
}
