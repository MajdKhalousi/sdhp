import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
