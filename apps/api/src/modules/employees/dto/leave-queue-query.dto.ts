import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Org-wide leave queue (GET /v1/leave-requests?status=...) — paginated like
// EmployeeQueryDto.
export class LeaveQueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiPropertyOptional({
    description: 'SUPER_ADMIN only — required to select the organization. Ignored for ORG_ADMIN, whose own org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
