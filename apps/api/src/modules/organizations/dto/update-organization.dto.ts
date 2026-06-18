import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiPropertyOptional({
    description: 'Activate/suspend the organization. SUPER_ADMIN only.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Subscription status. SUPER_ADMIN only.',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Subscription plan name. SUPER_ADMIN only. Send null to clear.',
    example: 'Pro',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  subscriptionPlan?: string | null;

  @ApiPropertyOptional({
    description: 'Subscription start date (ISO 8601). SUPER_ADMIN only. Send null to clear.',
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  subscriptionStartAt?: string | null;

  @ApiPropertyOptional({
    description: 'Subscription end date (ISO 8601). SUPER_ADMIN only. Send null to clear.',
    example: '2026-12-31T00:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  subscriptionEndAt?: string | null;

  @ApiPropertyOptional({
    description: 'Free-form subscription notes. SUPER_ADMIN only. Send null to clear.',
    example: 'Annual contract, invoiced externally.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  subscriptionNotes?: string | null;
}
