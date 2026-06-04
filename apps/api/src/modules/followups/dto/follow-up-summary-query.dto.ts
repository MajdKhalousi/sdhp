import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class FollowUpSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by doctor ID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Include follow-ups on or after this date (YYYY-MM-DD, Damascus time)', example: '2026-06-01' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dateFrom must be a valid date in YYYY-MM-DD format',
  })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Include follow-ups on or before this date (YYYY-MM-DD, Damascus time)', example: '2026-06-30' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dateTo must be a valid date in YYYY-MM-DD format',
  })
  dateTo?: string;
}
