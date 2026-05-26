import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: QueueStatus,
    isArray: true,
    description: 'Filter by one or more queue statuses. Repeat param for multiple.',
  })
  @IsOptional()
  @IsEnum(QueueStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value !== undefined ? [value] : undefined))
  status?: QueueStatus[];

  @ApiPropertyOptional({ description: 'Filter by doctor ID (via appointment)', example: 'doctor-cuid' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by QueueEntry.businessDate (Asia/Damascus calendar day). Defaults to today when omitted. Format: YYYY-MM-DD',
    example: '2026-05-22',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { message: 'date must be a valid date in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID (via appointment)', example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'SUPER_ADMIN only: filter by organization ID', example: 'org-cuid' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
