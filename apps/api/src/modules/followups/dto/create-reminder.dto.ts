import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderChannel } from '@prisma/client';

export class CreateReminderDto {
  @IsOptional()
  @IsEnum(ReminderChannel)
  @ApiPropertyOptional({ enum: ReminderChannel, default: ReminderChannel.IN_APP })
  channel?: ReminderChannel;
}
