import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class EncounterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by doctor ID', example: 'doctor-cuid' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by patient ID', example: 'patient-cuid' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by calendar day of startedAt (UTC). Format: YYYY-MM-DD',
    example: '2026-05-22',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { message: 'date must be a valid date in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID', example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
