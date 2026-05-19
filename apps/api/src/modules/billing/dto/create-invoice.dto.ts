import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvoiceDto {
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

  @ApiPropertyOptional({ example: 'appointment-cuid' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'encounter-cuid' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Must be 0 or omitted on create. Discount can be applied after items are added.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
