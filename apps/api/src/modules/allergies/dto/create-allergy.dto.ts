import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllergySeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAllergyDto {
  @ApiProperty({ example: 'Penicillin' })
  @IsString()
  substance: string;

  @ApiPropertyOptional({ example: 'Rash, hives' })
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional({ enum: AllergySeverity, example: AllergySeverity.SEVERE })
  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;
}
