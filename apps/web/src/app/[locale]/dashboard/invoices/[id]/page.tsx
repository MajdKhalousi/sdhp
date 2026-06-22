'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { INVOICE_READ_ROLES } from '@/lib/permissions';
import { InvoiceDetail } from '@/components/billing/invoice-detail';

interface Props {
  params: { id: string };
}

export default function InvoicePage({ params }: Props) {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !INVOICE_READ_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !INVOICE_READ_ROLES.has(user.role)) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <InvoiceDetail invoiceId={params.id} />
    </div>
  );
}
