import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PatientQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by first name, last name, Arabic name, MRN, or phone (case-insensitive)',
    example: 'Ahmad',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
