import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateScheduleExceptionDto } from './create-schedule-exception.dto';

// date is immutable after creation — use DELETE + POST to change the date.
export class UpdateScheduleExceptionDto extends PartialType(
  OmitType(CreateScheduleExceptionDto, ['date'] as const),
) {}
