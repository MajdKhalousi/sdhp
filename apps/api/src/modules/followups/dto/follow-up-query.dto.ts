import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FollowUpStatus } from '../followups.types';

export class FollowUpQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: FollowUpStatus,
    isArray: true,
    description: 'Filter by follow-up status. Repeat the param to include multiple statuses.',
  })
  @IsOptional()
  @IsEnum(FollowUpStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value !== undefined ? [value] : undefined))
  status?: FollowUpStatus[];

  @ApiPropertyOptional({ description: 'Filter by doctor ID', example: 'doctor-cuid' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID', example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Return follow-ups with followUpDate on or after this date (YYYY-MM-DD, Damascus time)',
    example: '2026-06-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dateFrom must be a valid date in YYYY-MM-DD format',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Return follow-ups with followUpDate on or before this date (YYYY-MM-DD, Damascus time)',
    example: '2026-06-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'dateTo must be a valid date in YYYY-MM-DD format',
  })
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Search by patient first name, last name, or MRN', example: 'Ali' })
  @IsOptional()
  @IsString()
  search?: string;
}
