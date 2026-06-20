import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';

// organizationId excluded — an EmployeeProfile cannot be moved between organizations.
// accountMode/account excluded — account creation is a create-time-only operation (146B);
// PATCH continues to support only the existing userId link/unlink behavior.
export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['organizationId', 'accountMode', 'account'] as const),
) {}
