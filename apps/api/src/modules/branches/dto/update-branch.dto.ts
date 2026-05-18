import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';

// organizationId is intentionally excluded — branches cannot be moved between organizations.
export class UpdateBranchDto extends PartialType(OmitType(CreateBranchDto, ['organizationId'] as const)) {}
