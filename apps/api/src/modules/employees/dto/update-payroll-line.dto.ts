import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

// netSalary is never accepted here — it is always server-computed from
// baseSalarySnapshot + additions - deductions (Phase 148A/148B).
export class UpdatePayrollLineDto {
  @ApiPropertyOptional({ example: 50, description: 'Must be 0 or greater' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additions?: number;

  @ApiPropertyOptional({ example: 20, description: 'Must be 0 or greater' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional({ example: 'Bonus for covering extra shifts' })
  @IsOptional()
  @IsString()
  notes?: string;
}
