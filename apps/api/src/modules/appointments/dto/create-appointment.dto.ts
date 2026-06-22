import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'patient-cuid' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'doctor-cuid' })
  @IsString()
  doctorId: string;

  @ApiProperty({ example: '2026-05-20T09:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 20, description: 'Appointment duration in minutes' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  durationMin?: number;

  @ApiPropertyOptional({ enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: 'Chest pain follow-up' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Patient requested reschedule' })
  @IsOptional()
  @IsString()
  cancelReason?: string;

  @ApiPropertyOptional({ example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'visit-type-cuid', description: 'Visit type ID (optional)' })
  @IsOptional()
  @IsString()
  visitTypeId?: string;

  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN. Ignored for ORG_ADMIN — their org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Encounter that prompted this follow-up booking.',
    example: 'encounter-cuid',
  })
  @IsOptional()
  @IsString()
  sourceEncounterId?: string;

  @ApiPropertyOptional({
    description:
      'Marks this request as an immediate walk-in. When true, scheduledAt must be near current server time. Request-only — never persisted.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isWalkIn?: boolean;
}
