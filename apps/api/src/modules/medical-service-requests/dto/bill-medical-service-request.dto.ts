import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BillMedicalServiceRequestDto {
  @ApiProperty({ example: 'invoice-cuid', description: 'Target DRAFT invoice to bill this request onto.' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;
}
