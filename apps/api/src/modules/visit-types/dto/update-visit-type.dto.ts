import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateVisitTypeDto } from './create-visit-type.dto';

export class UpdateVisitTypeDto extends PartialType(OmitType(CreateVisitTypeDto, ['code'])) {
  @ApiPropertyOptional({ description: 'Activate or deactivate the visit type' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
