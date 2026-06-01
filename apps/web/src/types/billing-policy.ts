export interface BillingPolicy {
  id: string;
  organizationId: string;
  autoCreateInvoiceOnCheckin: boolean;
  invoiceNumberPrefix: string;
  freeFollowUpWindowDays: number;
  followUpDiscountPercent: number;
  requirePaymentBeforeEncounter: boolean;
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
  defaultDueDateDays?: number;
  noShowFeeAmount?: number;
}
