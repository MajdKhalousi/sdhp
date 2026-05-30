import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(OmitType(CreateServiceDto, ['code'])) {
  @ApiPropertyOptional({ description: 'Activate or deactivate the service' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
