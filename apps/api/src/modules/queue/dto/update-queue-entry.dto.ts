import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

// appointmentId excluded — a queue entry cannot be re-linked to a different appointment.
// ticketNumber excluded — ticket numbers are immutable after creation.
// calledAt/completedAt are set automatically by the service on status transitions.
export class UpdateQueueEntryDto {
  @ApiPropertyOptional({ enum: QueueStatus })
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;
}
