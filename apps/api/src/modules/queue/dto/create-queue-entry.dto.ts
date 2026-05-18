import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQueueEntryDto {
  @ApiProperty({ description: 'ID of an existing non-deleted Appointment in the same org', example: 'appointment-cuid' })
  @IsString()
  appointmentId: string;

  @ApiPropertyOptional({
    description: 'Ticket number. Auto-generated (max in org + 1) if not provided.',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  ticketNumber?: number;

  @ApiPropertyOptional({ enum: QueueStatus, default: QueueStatus.WAITING })
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;
}
