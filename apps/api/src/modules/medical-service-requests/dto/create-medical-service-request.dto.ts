import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMedicalServiceRequestDto {
  @ApiPropertyOptional({ description: 'SUPER_ADMIN only — target organization. Auto-derived from patient if omitted.' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'patient-cuid' })
  @IsString()
  patientId: string;

  @ApiProperty({ example: 'service-cuid' })
  @IsString()
  serviceId: string;

  @ApiPropertyOptional({ example: 'appointment-cuid' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'encounter-cuid' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ example: 'doctor-cuid', description: 'Doctor.id — not the User id.' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
