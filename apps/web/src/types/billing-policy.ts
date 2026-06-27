export type AppointmentPaymentPolicy =
  | 'NONE'
  | 'OPTIONAL_PREPAYMENT'
  | 'DEPOSIT_REQUIRED'
  | 'FULL_PREPAYMENT_REQUIRED';

export interface BillingPolicy {
  id: string;
  organizationId: string;
  autoCreateInvoiceOnCheckin: boolean;
  invoiceNumberPrefix: string;
  freeFollowUpWindowDays: number;
  followUpDiscountPercent: number;
  requirePaymentBeforeEncounter: boolean;
  appointmentPaymentPolicy: AppointmentPaymentPolicy;
  appointmentDepositPercent: number;
  defaultDueDateDays: number;
  noShowFeeAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBillingPolicyDto {
  autoCreateInvoiceOnCheckin?: boolean;
  invoiceNumberPrefix?: string;
  freeFollowUpWindowDays?: number;
  followUpDiscountPercent?: number;
  requirePaymentBeforeEncounter?: boolean;
  appointmentPaymentPolicy?: AppointmentPaymentPolicy;
  appointmentDepositPercent?: number;
  defaultDueDateDays?: number;
  noShowFeeAmount?: number;
}
