import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AppointmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: AppointmentStatus,
    isArray: true,
    description: 'Filter by one or more statuses. Repeat param for multiple.',
  })
  @IsOptional()
  @IsEnum(AppointmentStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value !== undefined ? [value] : undefined))
  status?: AppointmentStatus[];

  @ApiPropertyOptional({ description: 'Filter by doctor ID', example: 'doctor-cuid' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by patient ID', example: 'patient-cuid' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by calendar day of scheduledAt (UTC). Format: YYYY-MM-DD',
    example: '2026-05-22',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID', example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
