import { PaymentMethod } from '@prisma/client';

export interface InvoiceItemPdf {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface InvoicePaymentPdf {
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  referenceNumber: string | null;
  receivedByName: string;
  voidedAt: Date | null;
  voidReason: string | null;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  issuedAt: Date | null;
  createdAt: Date;
  dueDate: Date | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  cancelReason: string | null;
  patient: { firstName: string; lastName: string; mrn: string };
  createdByName: string;
  items: InvoiceItemPdf[];
  payments: InvoicePaymentPdf[];
  orgName: string;
  orgNameAr: string | null;
}

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fmtMoney(n: number): string {
  return (
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' SYP'
  );
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  INSURANCE: 'Insurance',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#6b7280' },
  ISSUED: { label: 'Issued', color: '#1d4ed8' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: '#92400e' },
  PAID: { label: 'Paid', color: '#15803d' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626' },
};

export function buildInvoiceHtml(data: InvoicePdfData): string {
  const org = esc(data.orgNameAr ?? data.orgName);
  const patient = esc(`${data.patient.firstName} ${data.patient.lastName}`);
  const statusInfo = STATUS_LABELS[data.status] ?? { label: data.status, color: '#6b7280' };
  const docDate = fmtDate(data.issuedAt ?? data.createdAt);

  const activePayments = data.payments.filter((p) => !p.voidedAt);
  const voidedPayments = data.payments.filter((p) => p.voidedAt);

  const itemRows = data.items
    .map(
      (item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="td">${esc(item.description)}</td>
      <td class="td td-num">${item.quantity}</td>
      <td class="td td-num" dir="ltr">${fmtMoney(item.unitPrice)}</td>
      <td class="td td-num" dir="ltr">${item.discount > 0 ? fmtMoney(item.discount) : '—'}</td>
      <td class="td td-num" dir="ltr">${fmtMoney(item.totalPrice)}</td>
    </tr>`,
    )
    .join('');

  const paymentRows = activePayments
    .map(
      (p) => `
    <tr>
      <td class="td" dir="ltr">${fmtDate(p.paidAt)}</td>
      <td class="td">${METHOD_LABELS[p.method] ?? p.method}</td>
      <td class="td td-num" dir="ltr">${fmtMoney(p.amount)}</td>
      <td class="td">${esc(p.referenceNumber) || '—'}</td>
      <td class="td">${esc(p.receivedByName)}</td>
    </tr>`,
    )
    .join('');

  const voidedRows = voidedPayments
    .map(
      (p) => `
    <tr style="opacity:0.55">
      <td class="td" dir="ltr"><s>${fmtDate(p.paidAt)}</s></td>
      <td class="td"><s>${METHOD_LABELS[p.method] ?? p.method}</s></td>
      <td class="td td-num" dir="ltr"><s>${fmtMoney(p.amount)}</s></td>
      <td class="td" colspan="2" style="color:#dc2626;font-size:8.5pt">${esc(p.voidReason) || 'Voided'}</td>
    </tr>`,
    )
    .join('');

  const paymentsSection =
    data.payments.length === 0
      ? ''
      : `
  <div class="section-title">Payment History</div>
  <table class="tbl">
    <thead>
      <tr class="th-row">
        <th class="th">Date</th>
        <th class="th">Method</th>
        <th class="th th-num">Amount</th>
        <th class="th">Reference</th>
        <th class="th">Received By</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
      ${voidedRows}
    </tbody>
  </table>`;

  const remaining = Math.max(0, data.totalAmount - data.paidAmount);

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Invoice ${esc(data.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    line-height: 1.55;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1e40af;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .org-name { font-size: 15pt; font-weight: 700; color: #1e40af; }
  .org-sub { font-size: 9pt; color: #6b7280; margin-top: 3px; }
  .inv-block { text-align: right; }
  .inv-number { font-size: 12pt; font-weight: 700; direction: ltr; }
  .inv-date { font-size: 9pt; color: #6b7280; direction: ltr; }
  .status-pill {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 8.5pt;
    font-weight: 600;
    color: white;
    background: ${statusInfo.color};
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px 24px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 11px 14px;
    margin-bottom: 18px;
    font-size: 9.5pt;
  }
  .meta-item { display: flex; gap: 5px; }
  .meta-label { color: #6b7280; white-space: nowrap; }
  .meta-value { font-weight: 600; }
  .section-title {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    margin-bottom: 6px;
    margin-top: 18px;
  }
  .tbl { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .th-row { background: #f1f5f9; }
  .th {
    padding: 7px 10px;
    text-align: left;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #374151;
    border-bottom: 1px solid #e2e8f0;
  }
  .th-num { text-align: right; }
  .td { padding: 7px 10px; border-bottom: 1px solid #f0f4f8; vertical-align: top; }
  .td-num { text-align: right; }
  .row-odd { background: #fafbfc; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 14px; }
  .totals-box { width: 260px; font-size: 9.5pt; }
  .t-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .t-label { color: #6b7280; }
  .t-value { font-weight: 600; direction: ltr; }
  .t-sep { border-top: 1px solid #e2e8f0; margin: 6px 0; }
  .t-total { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11pt; font-weight: 700; border-top: 2px solid #1e40af; }
  .t-remaining { display: flex; justify-content: space-between; padding: 4px 0; font-weight: 600; color: ${remaining > 0 && data.status !== 'CANCELLED' ? '#b45309' : '#15803d'}; }
  .notes-box {
    margin-top: 16px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 10px 13px;
    font-size: 9.5pt;
    color: #78350f;
  }
  .footer {
    margin-top: 30px;
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    font-size: 8.5pt;
    color: #9ca3af;
    display: flex;
    justify-content: space-between;
    direction: ltr;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="org-name" dir="auto">${org}</div>
    <div class="org-sub">Invoice Document</div>
  </div>
  <div class="inv-block">
    <div class="inv-number" dir="ltr">${esc(data.invoiceNumber)}</div>
    <div class="inv-date">Date: ${docDate}</div>
    ${data.dueDate ? `<div class="inv-date">Due: ${fmtDate(data.dueDate)}</div>` : ''}
    <div><span class="status-pill">${statusInfo.label}</span></div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item">
    <span class="meta-label">Patient:</span>
    <span class="meta-value" dir="auto">${patient}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">MRN:</span>
    <span class="meta-value" dir="ltr">${esc(data.patient.mrn)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Issued by:</span>
    <span class="meta-value" dir="auto">${esc(data.createdByName)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">Issued on:</span>
    <span class="meta-value" dir="ltr">${docDate}</span>
  </div>
</div>

${data.items.length > 0 ? `
<div class="section-title">Services &amp; Items</div>
<table class="tbl">
  <thead>
    <tr class="th-row">
      <th class="th">Description</th>
      <th class="th th-num">Qty</th>
      <th class="th th-num">Unit Price</th>
      <th class="th th-num">Discount</th>
      <th class="th th-num">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>` : ''}

<div class="totals-wrap">
  <div class="totals-box">
    <div class="t-row">
      <span class="t-label">Subtotal</span>
      <span class="t-value">${fmtMoney(data.subtotal)}</span>
    </div>
    ${data.discountAmount > 0 ? `<div class="t-row">
      <span class="t-label">Discount</span>
      <span class="t-value">- ${fmtMoney(data.discountAmount)}</span>
    </div>` : ''}
    <div class="t-total">
      <span>Total</span>
      <span dir="ltr">${fmtMoney(data.totalAmount)}</span>
    </div>
    ${data.paidAmount > 0 ? `<div class="t-row">
      <span class="t-label">Paid</span>
      <span class="t-value" style="color:#15803d">- ${fmtMoney(data.paidAmount)}</span>
    </div>` : ''}
    ${data.status !== 'CANCELLED' ? `<div class="t-remaining">
      <span>Balance Due</span>
      <span dir="ltr">${fmtMoney(remaining)}</span>
    </div>` : ''}
  </div>
</div>

${paymentsSection}

${data.notes ? `<div class="notes-box"><strong>Notes:</strong> ${esc(data.notes)}</div>` : ''}

<div class="footer">
  <span>Generated: ${fmtDate(new Date())}</span>
  <span>${esc(data.orgNameAr ?? data.orgName)} — Elaji Health</span>
</div>

</body>
</html>`;
}
