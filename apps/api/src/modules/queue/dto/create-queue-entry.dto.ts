import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateQueueEntryDto {
  @ApiProperty({
    description: 'ID of an existing non-deleted Appointment in the same org',
    example: 'appointment-cuid',
  })
  @IsString()
  appointmentId: string;
}
