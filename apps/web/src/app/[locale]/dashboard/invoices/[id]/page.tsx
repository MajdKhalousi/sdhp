'use client';

import { InvoiceDetail } from '@/components/billing/invoice-detail';

interface Props {
  params: { id: string };
}

export default function InvoicePage({ params }: Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <InvoiceDetail invoiceId={params.id} />
    </div>
  );
}
