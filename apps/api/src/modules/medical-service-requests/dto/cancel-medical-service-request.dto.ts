import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelMedicalServiceRequestDto {
  @ApiProperty({ example: 'Patient declined the service' })
  @IsString()
  @IsNotEmpty()
  cancelReason: string;
}
