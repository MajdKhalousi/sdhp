import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'SUPER_ADMIN only — filter by organization. Ignored for other roles.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by branch. Validated to belong to the resolved organization.',
    example: 'branch-cuid',
  })
  @IsOptional()
  @IsString()
  branchId?: string;
}
