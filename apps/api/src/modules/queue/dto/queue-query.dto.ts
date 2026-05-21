import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
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
    description: 'Filter by calendar day of appointment scheduledAt (UTC). Format: YYYY-MM-DD',
    example: '2026-05-22',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID (via appointment)', example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
