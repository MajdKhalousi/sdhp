import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
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
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { message: 'date must be a valid date in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID', example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'SUPER_ADMIN only: filter by organization ID', example: 'org-cuid' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by source encounter ID (follow-up bookings)', example: 'encounter-cuid' })
  @IsOptional()
  @IsString()
  sourceEncounterId?: string;
}
