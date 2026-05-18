import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDoctorDto } from './create-doctor.dto';

// userId excluded — doctor profiles cannot be re-linked to a different user.
// organizationId excluded — doctor profiles cannot be moved between organizations.
export class UpdateDoctorDto extends PartialType(
  OmitType(CreateDoctorDto, ['userId', 'organizationId'] as const),
) {}
