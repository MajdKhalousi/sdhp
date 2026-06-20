import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class EmployeeDetailQueryDto {
  @ApiPropertyOptional({
    description: 'Allow fetching this profile even if soft-deleted. Read-only — has no effect on PATCH/DELETE. Default: false.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
