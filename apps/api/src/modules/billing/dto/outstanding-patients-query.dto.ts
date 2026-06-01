import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class OutstandingPatientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by branch within the caller organization' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
