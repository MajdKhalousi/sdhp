'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganization } from '@/hooks/use-organizations';
import { useSubscriptionPayments } from '@/hooks/use-subscription-payments';
import { useStaff } from '@/hooks/use-staff';
import { isDemoOrganization } from '@/lib/demo-organizations';

interface Props {
  params: { organizationId: string; paymentId: string };
}

// Display-only shortening, mirroring the Phase 136E audit table helper —
// duplicated locally rather than shared, consistent with this codebase's
// per-page-duplication convention for small formatting helpers.
function shortenId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default function SubscriptionPaymentReceiptPage({ params }: Props) {
  const { organizationId, paymentId } = params;
  const t = useTranslations('platform.organizationDetail.subscriptionPayments');
  const tDemo = useTranslations('platform.demo');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();

  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB';

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const isSuperAdmin = !!user && PLATFORM_ACCESS_ROLES.has(user.role);

  const {
    data: organization,
    isLoading: orgLoading,
    isError: orgError,
  } = useOrganization(isSuperAdmin ? organizationId : '');
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useSubscriptionPayments(isSuperAdmin ? organizationId : '');
  const { data: allUsers = [] } = useStaff(true);

  const payment = payments.find((p) => p.id === paymentId);
  const isLoading = orgLoading || paymentsLoading;
  const notFound = !isLoading && (orgError || paymentsError || !organization || !payment);

  useEffect(() => {
    if (isSuperAdmin && !isLoading && !notFound) {
      window.print();
    }
  }, [isSuperAdmin, isLoading, notFound]);

  if (!user || !isSuperAdmin) return null;

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(displayLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const printTimestamp = new Intl.DateTimeFormat(displayLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  function recordedByName(createdByUserId: string): string {
    const match = allUsers.find((candidate) => candidate.id === createdByUserId);
    return match ? `${match.firstName} ${match.lastName}` : '—';
  }

  function formatPeriod(p: { periodStartAt: string | null; periodEndAt: string | null }): string {
    const start = p.periodStartAt ? formatDate(p.periodStartAt) : null;
    const end = p.periodEndAt ? formatDate(p.periodEndAt) : null;
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
    if (end) return end;
    return '—';
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t('receipt.loading')}</p>
      </div>
    );
  }

  if (notFound || !organization || !payment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-destructive">{t('receipt.notFound')}</p>
        <button
          onClick={() => window.close()}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          {t('receipt.actions.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      {/* Controls — screen only */}
      <div className="print:hidden mb-6 flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          {t('receipt.actions.back')}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('receipt.actions.print')}
        </button>
      </div>

      <div className="space-y-6">
        {/* Document header */}
        <div className="border-b pb-4 text-center">
          <p className="text-sm font-semibold text-muted-foreground">{t('receipt.brand')}</p>
          <h1 className="text-2xl font-bold">{t('receipt.title')}</h1>
          <p className="mt-1 font-mono text-sm font-medium" dir="ltr" title={payment.id}>
            {shortenId(payment.id)}
          </p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('receipt.paidAt')}</p>
            <p dir="ltr">{formatDate(payment.paidAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('receipt.recordedAt')}</p>
            <p dir="ltr">{formatDate(payment.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('receipt.printedAt')}</p>
            <p dir="ltr">{printTimestamp}</p>
          </div>
        </div>

        {/* Organization */}
        <section className="break-inside-avoid rounded-md border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('receipt.organization')}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="col-span-2 flex items-center gap-2 font-semibold" dir="auto">
              {organization.name}
              {isDemoOrganization(organization.id) && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  {tDemo('badge')}
                </span>
              )}
            </div>
            {organization.nameAr && (
              <div className="col-span-2 text-muted-foreground" dir="auto">
                {organization.nameAr}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('receipt.organizationType')}: </span>
              <span>{organization.type}</span>
            </div>
          </div>
        </section>

        {/* Payment details */}
        <section className="break-inside-avoid rounded-md border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('receipt.title')}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <span className="text-muted-foreground">{t('receipt.amount')}: </span>
              <span className="font-semibold tabular-nums" dir="ltr">
                {payment.amount} {payment.currency}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('receipt.method')}: </span>
              <span>{t(`methods.${payment.method}`)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('receipt.reference')}: </span>
              <span dir="ltr">{payment.reference ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('receipt.period')}: </span>
              <span dir="ltr">{formatPeriod(payment)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('receipt.recordedBy')}: </span>
              <span dir="auto">{recordedByName(payment.createdByUserId)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">{t('receipt.notes')}: </span>
              <span dir="auto">{payment.notes ?? '—'}</span>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground" dir="auto">
          {t('receipt.disclaimer')}
        </p>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p>{t('receipt.generatedBy')}</p>
          <p className="mt-0.5" dir="ltr">{printTimestamp}</p>
        </div>
      </div>
    </div>
  );
}
