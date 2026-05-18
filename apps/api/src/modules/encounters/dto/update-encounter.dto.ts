import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEncounterDto } from './create-encounter.dto';

// organizationId excluded — encounters cannot be moved between organizations.
// patientId excluded — the patient on an encounter must not change.
// doctorId excluded — reassigning a doctor changes clinical ownership.
// appointmentId excluded — encounter-appointment link is set at creation only.
export class UpdateEncounterDto extends PartialType(
  OmitType(CreateEncounterDto, ['organizationId', 'patientId', 'doctorId', 'appointmentId'] as const),
) {}
