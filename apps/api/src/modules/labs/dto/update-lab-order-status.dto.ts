import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LabOrderStatus } from '@prisma/client';

export class UpdateLabOrderStatusDto {
  @ApiProperty({ enum: LabOrderStatus, description: 'Target status. RESULTED and REVIEWED have dedicated endpoints.' })
  @IsEnum(LabOrderStatus)
  status: LabOrderStatus;

  @ApiPropertyOptional({ description: 'Required when status is CANCELLED' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
