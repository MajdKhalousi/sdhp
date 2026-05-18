import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';

// organizationId excluded — patients cannot be moved between organizations.
// mrn excluded — MRN is the medical identity within an org and must not change after creation.
export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['organizationId', 'mrn'] as const),
) {}
