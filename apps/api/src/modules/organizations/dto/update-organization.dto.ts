import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiPropertyOptional({
    description: 'Activate/suspend the organization. SUPER_ADMIN only.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
