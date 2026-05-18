import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// organizationId excluded — users cannot be moved between organizations.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['organizationId'] as const),
) {}
