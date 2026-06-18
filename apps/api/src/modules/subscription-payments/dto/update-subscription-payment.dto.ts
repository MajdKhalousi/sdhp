import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { SubscriptionPaymentMethod } from '@prisma/client';

// organizationId and createdByUserId are deliberately not included here —
// combined with the global ValidationPipe's forbidNonWhitelisted, any attempt
// to send them is rejected rather than silently ignored.
export class UpdateSubscriptionPaymentDto {
  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: 'SYP' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be an uppercase 3-letter code, e.g. SYP, USD' })
  currency?: string;

  @ApiPropertyOptional({ enum: SubscriptionPaymentMethod })
  @IsOptional()
  @IsEnum(SubscriptionPaymentMethod)
  method?: SubscriptionPaymentMethod;

  @ApiPropertyOptional({ description: 'Send null to clear.', nullable: true })
  @IsOptional()
  @IsString()
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Send null to clear.', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-06-18T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'Send null to clear.', example: '2026-06-01T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  periodStartAt?: string | null;

  @ApiPropertyOptional({ description: 'Send null to clear.', example: '2026-07-01T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  periodEndAt?: string | null;
}
