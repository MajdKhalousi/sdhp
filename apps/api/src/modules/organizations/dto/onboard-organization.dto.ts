import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrganizationType } from '@prisma/client';

export class InitialBranchDto {
  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'الفرع الرئيسي' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ example: '+963112345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Damascus, Al-Mazzeh Street' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class InitialAdminDto {
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

  @ApiProperty({ example: '+963912345679' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'admin@hospital.sy' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'password12', minLength: 10 })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Password must contain at least one letter and one number' })
  password: string;
}

export class OnboardOrganizationDto {
  @ApiProperty({ example: 'Damascus General Hospital' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'مشفى دمشق العام' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ enum: OrganizationType, default: OrganizationType.CLINIC })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiPropertyOptional({ example: '+963112345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@hospital.sy' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Damascus, Syria' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ type: InitialBranchDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => InitialBranchDto)
  initialBranch: InitialBranchDto;

  @ApiProperty({ type: InitialAdminDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => InitialAdminDto)
  initialAdmin: InitialAdminDto;
}
