import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

// organizationId excluded — appointments cannot be moved between organizations.
// patientId excluded — the patient on an appointment must not change after creation.
// doctorId excluded — reassigning a doctor is a workflow operation beyond simple PATCH.
export class UpdateAppointmentDto extends PartialType(
  OmitType(CreateAppointmentDto, ['organizationId', 'patientId', 'doctorId'] as const),
) {}
