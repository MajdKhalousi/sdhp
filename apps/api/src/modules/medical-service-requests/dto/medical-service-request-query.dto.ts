import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MedicalServiceRequestQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Patient ID to list service requests for' })
  @IsString()
  patientId: string;
}
