import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
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
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Damascus, Syria' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
