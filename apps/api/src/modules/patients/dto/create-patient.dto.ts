import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Ahmad' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Khalil' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: 'أحمد' })
  @IsOptional()
  @IsString()
  firstNameAr?: string;

  @ApiPropertyOptional({ example: 'خليل' })
  @IsOptional()
  @IsString()
  lastNameAr?: string;

  @ApiPropertyOptional({
    description: 'Medical Record Number. Auto-generated if not provided.',
    example: 'P-20260518-A1B2',
  })
  @IsOptional()
  @IsString()
  mrn?: string;

  @ApiPropertyOptional({ example: '1990-04-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '+963912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'patient@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ example: 'A+' })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional({ example: 'Damascus, Syria' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Fatima Khalil' })
  @IsOptional()
  @IsString()
  emergencyName?: string;

  @ApiPropertyOptional({ example: '+963912000000' })
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiPropertyOptional({ example: 'Penicillin allergy' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN. Ignored for ORG_ADMIN — their org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
