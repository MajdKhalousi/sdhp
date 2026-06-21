import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePayrollRunDto {
  @ApiProperty({ example: 2026, description: 'Calendar year' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 6, description: 'Calendar month, 1-12' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'SUPER_ADMIN only — required to select the organization. Ignored for ORG_ADMIN, whose own org is used automatically.',
    example: 'org-cuid',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
