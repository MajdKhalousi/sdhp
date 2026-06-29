import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PrescriptionTemplateItemDto } from './prescription-template-item.dto';

export class CreatePrescriptionTemplateDto {
  @ApiProperty({ example: 'Common Cold Pack' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'حزمة نزلة البرد' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [PrescriptionTemplateItemDto], description: 'At least one medication line' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionTemplateItemDto)
  items: PrescriptionTemplateItemDto[];
}
