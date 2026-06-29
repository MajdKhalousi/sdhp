import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreatePrescriptionTemplateDto } from './create-prescription-template.dto';
import { PrescriptionTemplateItemDto } from './prescription-template-item.dto';

// items omitted from PartialType's auto-derivation so it can keep its own
// "if provided, at least one item" validation independent of `required`.
export class UpdatePrescriptionTemplateDto extends PartialType(
  OmitType(CreatePrescriptionTemplateDto, ['items']),
) {
  @ApiPropertyOptional({
    type: [PrescriptionTemplateItemDto],
    description: 'If provided, replaces all existing items atomically. Omit to leave items unchanged.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionTemplateItemDto)
  items?: PrescriptionTemplateItemDto[];
}
