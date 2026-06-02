import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class DuplicateCheckQueryDto {
  @ApiProperty({ example: 'Ahmad' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Khalil' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: '+963912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ example: '1990-04-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
