import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { EmploymentStatus, Gender } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN. Ignored for ORG_ADMIN — their own org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Link to an existing User account. Omit for an HR-only employee with no login access.',
    example: 'user-cuid',
  })
  @IsOptional()
  @IsString()
  userId?: string | null;

  @ApiPropertyOptional({ example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'department-cuid' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: 'Rana' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Saadeh' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: 'رنا' })
  @IsOptional()
  @IsString()
  firstNameAr?: string;

  @ApiPropertyOptional({ example: 'سعادة' })
  @IsOptional()
  @IsString()
  lastNameAr?: string;

  @ApiPropertyOptional({ example: 'Office Manager' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Free-text department fallback when no Department row fits yet' })
  @IsOptional()
  @IsString()
  departmentFreeText?: string;

  @ApiPropertyOptional({ example: '+963911000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'employee@demo.sdhp' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '01234567890' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Damascus, Syria' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  contractStartAt?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsDateString()
  contractEndAt?: string;

  @ApiPropertyOptional({ enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({ example: 500, description: 'Base salary amount' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  baseSalary?: number;

  @ApiPropertyOptional({ example: 'SYP', default: 'SYP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Part-time, Sun-Thu' })
  @IsOptional()
  @IsString()
  notes?: string;
}
