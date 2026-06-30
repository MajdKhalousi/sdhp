import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelEncounterDto {
  @ApiPropertyOptional({ example: 'Started for the wrong patient' })
  @IsOptional()
  @IsString()
  reason?: string;
}
