import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddInvoiceItemDto {
  @ApiPropertyOptional({
    description: 'Required when serviceId is not provided. Auto-filled from Service.name if serviceId is given.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Required when serviceId is not provided. Defaults to Service.defaultPrice if serviceId is given; can be overridden.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Service catalog ID. Auto-fills description and unitPrice from Service; both can still be overridden.',
  })
  @IsOptional()
  @IsString()
  serviceId?: string;
}
