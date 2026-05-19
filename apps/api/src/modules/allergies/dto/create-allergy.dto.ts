import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAllergyDto {
  @ApiProperty({ example: 'Penicillin' })
  @IsString()
  substance: string;

  @ApiPropertyOptional({ example: 'Rash, hives' })
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional({ example: 'SEVERE' })
  @IsOptional()
  @IsString()
  severity?: string;
}
