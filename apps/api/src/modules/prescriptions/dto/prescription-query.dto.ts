import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PrescriptionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter prescriptions by encounter ID' })
  @IsOptional()
  @IsString()
  encounterId?: string;
}
