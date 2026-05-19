import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RadiologyOrderStatus } from '@prisma/client';

export class UpdateRadiologyOrderStatusDto {
  @ApiProperty({ enum: RadiologyOrderStatus })
  @IsEnum(RadiologyOrderStatus)
  status: RadiologyOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
