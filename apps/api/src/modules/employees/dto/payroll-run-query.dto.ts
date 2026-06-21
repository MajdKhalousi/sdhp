import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollRunStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Org-wide payroll run list (GET /v1/payroll/runs) — paginated like
// LeaveQueueQueryDto.
export class PayrollRunQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ enum: PayrollRunStatus })
  @IsOptional()
  @IsEnum(PayrollRunStatus)
  status?: PayrollRunStatus;

  @ApiPropertyOptional({
    description: 'SUPER_ADMIN only — required to select the organization. Ignored for ORG_ADMIN, whose own org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
