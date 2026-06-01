import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateBillingPolicyDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: true, description: 'Auto-create a DRAFT invoice when an appointment is checked in' })
  autoCreateInvoiceOnCheckin?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{1,6}$/, { message: 'Prefix must be 1–6 uppercase letters or digits (e.g. INV, CLI)' })
  @ApiPropertyOptional({ default: 'INV', pattern: '^[A-Z0-9]{1,6}$' })
  invoiceNumberPrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  @Type(() => Number)
  @ApiPropertyOptional({ minimum: 0, maximum: 365, default: 0, description: '0 = disabled; >0 = follow-ups within N days of last consultation are free' })
  freeFollowUpWindowDays?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0, description: 'Percentage discount applied to follow-ups outside the free window' })
  followUpDiscountPercent?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: false, description: 'Show unpaid invoice warning before encounter — never blocks clinical access' })
  requirePaymentBeforeEncounter?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  @Type(() => Number)
  @ApiPropertyOptional({ minimum: 0, maximum: 365, default: 0, description: 'Days after issuance the invoice is due; 0 = same day' })
  defaultDueDateDays?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @ApiPropertyOptional({ minimum: 0, default: 0, description: 'Fee charged when appointment is marked no-show; 0 = no fee' })
  noShowFeeAmount?: number;
}
