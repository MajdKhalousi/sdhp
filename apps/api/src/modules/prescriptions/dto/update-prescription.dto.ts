import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePrescriptionDto } from './create-prescription.dto';

// encounterId excluded — prescriptions cannot be moved between encounters.
export class UpdatePrescriptionDto extends PartialType(
  OmitType(CreatePrescriptionDto, ['encounterId'] as const),
) {}
