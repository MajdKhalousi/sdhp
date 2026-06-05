import type { InvoiceStatus } from '@/types/invoice';

function getDamascusDateStr(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

export function isOverdue(invoice: {
  status: InvoiceStatus;
  dueDate: string | null | undefined;
}): boolean {
  if (!invoice.dueDate) return false;
  if (invoice.status !== 'ISSUED' && invoice.status !== 'PARTIALLY_PAID') return false;
  return invoice.dueDate.slice(0, 10) < getDamascusDateStr();
}
