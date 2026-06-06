import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientResponseStatus } from '@prisma/client';

export class RecordResponseDto {
  @IsEnum(PatientResponseStatus)
  @ApiProperty({ enum: PatientResponseStatus })
  patientResponse: PatientResponseStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiPropertyOptional({ maxLength: 1000 })
  contactNote?: string;
}
