import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';

// organizationId excluded — an EmployeeProfile cannot be moved between organizations.
export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['organizationId'] as const),
) {}
