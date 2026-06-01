import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoidPaymentDto {
  @ApiProperty({ description: 'Required reason for voiding this payment' })
  @IsString()
  @IsNotEmpty()
  voidReason: string;
}
