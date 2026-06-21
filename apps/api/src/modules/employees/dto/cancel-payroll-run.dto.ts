import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelPayrollRunDto {
  @ApiPropertyOptional({ example: 'Generated for the wrong month' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
