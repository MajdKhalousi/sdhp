import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

// Org-wide roster view for one calendar date (GET /v1/attendance?date=...).
export class DailyAttendanceQueryDto {
  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'SUPER_ADMIN only — required to select the organization. Ignored for ORG_ADMIN, whose own org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
