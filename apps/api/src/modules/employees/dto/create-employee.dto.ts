import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { EmploymentStatus, Gender, UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EmployeeAccountMode {
  NONE = 'NONE',
  LINK_EXISTING = 'LINK_EXISTING',
  CREATE_NEW = 'CREATE_NEW',
}

// Deliberately does not repeat firstName/lastName/firstNameAr/lastNameAr —
// the account being created belongs to the same person as the employee
// profile, so EmployeesService copies those fields from CreateEmployeeDto
// itself rather than asking for them twice and risking a mismatch.
export class CreateEmployeeAccountDto {
  @ApiProperty({ example: '+963911000001' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'newstaff@demo.sdhp' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'password12', minLength: 10 })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Password must contain at least one letter and one number' })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.SECRETARY })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    enum: EmployeeAccountMode,
    description:
      'NONE: no login account. LINK_EXISTING: provide userId. CREATE_NEW: provide account. ' +
      'Omit to infer from userId for backward compatibility (userId present -> LINK_EXISTING, else NONE).',
  })
  @IsOptional()
  @IsEnum(EmployeeAccountMode)
  accountMode?: EmployeeAccountMode;

  @ApiPropertyOptional({
    description: 'Required when accountMode is CREATE_NEW. Must be absent otherwise.',
    type: CreateEmployeeAccountDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEmployeeAccountDto)
  account?: CreateEmployeeAccountDto;

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
