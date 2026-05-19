import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
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

  @ApiPropertyOptional({ description: 'Start of date range (inclusive)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End of date range (inclusive)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
