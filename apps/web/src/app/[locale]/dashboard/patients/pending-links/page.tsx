'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight, Clock, LinkIcon, RefreshCw, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  usePendingLinks,
  useCancelPendingLink,
  useResendPendingLinkCode,
  type PendingLinkItem,
  type ResendLinkCodeResult,
} from '@/hooks/use-patient';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function MaskedName({ item, locale }: { item: PendingLinkItem; locale: string }) {
  const { maskedPatient: p } = item;
  const useAr = locale === 'ar' && (p.firstNameAr || p.lastNameArInitial);
  if (useAr) {
    const first = p.firstNameAr ?? '';
    const last = p.lastNameArInitial ? `${p.lastNameArInitial}.` : '';
    return <span dir="rtl">{[first, last].filter(Boolean).join(' ') || '—'}</span>;
  }
  const first = p.firstName ?? '';
  const last = p.lastNameInitial ? `${p.lastNameInitial}.` : '';
  return <span>{[first, last].filter(Boolean).join(' ') || '—'}</span>;
}

interface ResendResultBannerProps {
  result: ResendLinkCodeResult;
  onDismiss: () => void;
  t: ReturnType<typeof useTranslations<'patient.pendingLinks'>>;
  locale: string;
}

function ResendResultBanner({ result, onDismiss, t, locale }: ResendResultBannerProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-900/40 dark:bg-green-950/20">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">{t('resendSuccess.title')}</p>
        <p className="text-xs text-green-700 dark:text-green-400">{t('resendSuccess.description')}</p>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-xs text-green-700 dark:text-green-400">{t('resendSuccess.codeLabel')}:</span>
          <span className="font-mono text-2xl font-bold tracking-widest text-green-900 dark:text-green-200" dir="ltr">
            {result.code}
          </span>
        </div>
        <p className="mt-1 text-xs text-green-600 dark:text-green-500">
          {t('resendSuccess.expiresLabel')}: {formatDateTime(result.expiresAt, locale)}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="mt-0.5 rounded-md p-1 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/40"
        aria-label={t('resendSuccess.dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PendingLinksPage() {
  const t = useTranslations('patient.pendingLinks');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuthStore();
  const isOrgAdmin = user?.role === 'ORG_ADMIN';

  const { data: links, isLoading, isError, refetch } = usePendingLinks();
  const cancelLink = useCancelPendingLink();
  const resendCode = useResendPendingLinkCode();
  const { toast } = useToast();

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [resendResult, setResendResult] = useState<ResendLinkCodeResult | null>(null);

  async function handleCancel(clinicPatientId: string) {
    try {
      await cancelLink.mutateAsync(clinicPatientId);
      setCancelConfirmId(null);
      if (resendResult?.clinicPatientId === clinicPatientId) setResendResult(null);
      toast({ title: t('actions.cancelRequest'), variant: 'success' });
    } catch {
      toast({ title: t('error.cancelFailed'), variant: 'error' });
    }
  }

  async function handleResend(clinicPatientId: string) {
    try {
      const result = await resendCode.mutateAsync(clinicPatientId);
      setResendResult(result);
    } catch {
      toast({ title: t('error.resendFailed'), variant: 'error' });
    }
  }

  const BackIcon = locale === 'ar' ? ChevronRight : ChevronLeft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center gap-1 rounded-md p-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <BackIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{t('title')}</h1>
            {links && (
              <p className="text-sm text-muted-foreground">
                {links.length > 0
                  ? t('badge', { count: links.length })
                  : t('badgeZero')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resend result banner */}
      {resendResult && (
        <ResendResultBanner
          result={resendResult}
          onDismiss={() => setResendResult(null)}
          t={t}
          locale={locale}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <button
            onClick={() => refetch()}
            className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      )}

      {/* Table / empty state */}
      {links && (
        links.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <LinkIcon className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('empty.heading')}</p>
            <p className="text-xs text-muted-foreground">{t('empty.description')}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">{t('tableColumns.requestRef')}</th>
                    <th className="px-4 py-3">{t('tableColumns.patient')}</th>
                    <th className="px-4 py-3">{t('tableColumns.phone')}</th>
                    <th className="px-4 py-3">{t('tableColumns.birthYear')}</th>
                    <th className="px-4 py-3">{t('tableColumns.requestedAt')}</th>
                    <th className="px-4 py-3">{t('tableColumns.expiresAt')}</th>
                    <th className="px-4 py-3">{t('tableColumns.status')}</th>
                    <th className="px-4 py-3">{t('tableColumns.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {links.map((link) => {
                    const isCancelConfirm = cancelConfirmId === link.clinicPatientId;
                    const isResending = resendCode.isPending && resendCode.variables === link.clinicPatientId;
                    const isCancelling = cancelLink.isPending && cancelLink.variables === link.clinicPatientId;

                    return (
                      <tr key={link.clinicPatientId} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">
                          {link.linkRequestNo}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <MaskedName item={link} locale={locale} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                          {link.maskedPatient.phoneLastFour ? `••••${link.maskedPatient.phoneLastFour}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {link.maskedPatient.birthYear ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(link.createdAt, locale)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {link.verificationExpiresAt
                            ? formatDateTime(link.verificationExpiresAt, locale)
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {link.isExpired ? (
                            <Badge variant="warning" className="flex w-fit items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('status.expired')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {t('status.pending')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isCancelConfirm ? (
                            <div className="flex flex-col gap-1.5">
                              <p className="text-xs text-destructive">{t('cancelConfirm.heading')}</p>
                              <p className="max-w-[220px] text-xs text-muted-foreground">{t('cancelConfirm.description')}</p>
                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  onClick={() => handleCancel(link.clinicPatientId)}
                                  disabled={isCancelling}
                                  className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                                >
                                  {isCancelling ? t('actions.cancelling') : t('cancelConfirm.confirm')}
                                </button>
                                <button
                                  onClick={() => setCancelConfirmId(null)}
                                  disabled={isCancelling}
                                  className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                                >
                                  {t('cancelConfirm.abort')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleResend(link.clinicPatientId)}
                                disabled={isResending || resendCode.isPending}
                                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                                {isResending ? t('actions.resending') : t('actions.resendCode')}
                              </button>
                              {isOrgAdmin && (
                                <button
                                  onClick={() => setCancelConfirmId(link.clinicPatientId)}
                                  disabled={cancelLink.isPending}
                                  className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                                >
                                  {t('actions.cancelRequest')}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
