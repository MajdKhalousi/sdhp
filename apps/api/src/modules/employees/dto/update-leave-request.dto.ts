import { PartialType } from '@nestjs/swagger';
import { CreateLeaveRequestDto } from './create-leave-request.dto';

// Deliberately extends only CreateLeaveRequestDto (type/startDate/endDate/
// reason) — status is never editable through this DTO. Status transitions
// only happen via the dedicated approve/reject/cancel routes.
export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}
