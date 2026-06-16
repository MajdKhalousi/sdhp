import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CashierSummaryQueryDto {
  @ApiPropertyOptional({
    description:
      'Date in YYYY-MM-DD format (Asia/Damascus, UTC+3). Defaults to today in Asia/Damascus timezone.',
    example: '2026-06-16',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'SUPER_ADMIN only — filter by organization. Ignored for other roles.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
