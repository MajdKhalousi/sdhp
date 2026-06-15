import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
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

  @ApiPropertyOptional({ example: 'staff@demo.sdhp' })
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

  @ApiPropertyOptional({ example: 'branch-cuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

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
