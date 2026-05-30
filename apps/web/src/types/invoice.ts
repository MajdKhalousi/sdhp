export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'INSURANCE' | 'OTHER';

export interface InvoicePatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isActive: boolean;
}

export interface InvoiceUserRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  isActive: boolean;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  visitTypeId: string | null;
  serviceId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  discount: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: string;
  method: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  paidAt: string;
  receivedById: string;
  createdAt: string;
  updatedAt: string;
  receivedBy: InvoiceUserRef;
}

export interface Invoice {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  appointmentId: string | null;
  encounterId: string | null;
  createdById: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  notes: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  patient: InvoicePatient;
  createdBy: InvoiceUserRef;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface InvoiceQuery {
  organizationId?: string;
  branchId?: string;
  patientId?: string;
  status?: InvoiceStatus;
  from?: string;
  to?: string;
}

export interface CreateInvoiceDto {
  patientId: string;
  appointmentId?: string;
  encounterId?: string;
  branchId?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoiceDto {
  notes?: string;
  discountAmount?: number;
  dueDate?: string;
  branchId?: string;
}

export interface AddInvoiceItemDto {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  notes?: string;
  serviceId?: string;
}

export interface RecordPaymentDto {
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  paidAt?: string;
}

export interface CancelInvoiceDto {
  cancelReason?: string;
}
