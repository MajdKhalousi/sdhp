import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class TodayHubQueryDto {
  @ApiPropertyOptional({
    description:
      'Calendar date in Asia/Damascus timezone (YYYY-MM-DD). Defaults to today when omitted.',
    example: '2026-06-13',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filter by branch. Validated to belong to the resolved organization.',
    example: 'branch-cuid',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by doctor. Ignored for the DOCTOR role — callers are always auto-scoped to their own profile.',
    example: 'doctor-cuid',
  })
  @IsOptional()
  @IsString()
  doctorId?: string;
}
