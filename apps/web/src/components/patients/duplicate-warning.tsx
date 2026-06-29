'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import type { DuplicateCandidate, DuplicateReason, PlatformCandidate, LinkRequestResult } from '@/hooks/use-patient';
import { useUnsavedGuardStore } from '@/store/unsaved-guard';

interface Props {
  matches: DuplicateCandidate[];
  platformCandidates?: PlatformCandidate[];
  onCreateAnyway: () => void;
  onCancel: () => void;
  isCreating: boolean;
  onRequestLink?: () => void;
  isRequestingLink?: boolean;
  linkRequestResult?: LinkRequestResult | null;
  onVerifyLink?: (code: string) => void;
  isVerifyingLink?: boolean;
  verifyError?: string | null;
  verifySuccess?: boolean;
}

const REASON_BADGE_CLASS = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium';
const REASON_COLORS: Record<DuplicateReason, string> = {
  nationalId: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  phone:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  name:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  nameAndDob: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export function DuplicateWarning({
  matches,
  platformCandidates = [],
  onCreateAnyway,
  onCancel,
  isCreating,
  onRequestLink,
  isRequestingLink = false,
  linkRequestResult = null,
  onVerifyLink,
  isVerifyingLink = false,
  verifyError = null,
  verifySuccess = false,
}: Props) {
  const t = useTranslations('patient.duplicate');
  const tForm = useTranslations('patient.form');
  const locale = useLocale();
  const router = useRouter();
  const guard = useUnsavedGuardStore();
  const isPhoneOnly = matches.every(m => m.reasons.length === 1 && m.reasons[0] === 'phone');
  const anyLinked = matches.some(m => m.isAlreadyLinked);

  const [otpValue, setOtpValue] = useState('');

  useEffect(() => {
    setOtpValue('');
  }, [linkRequestResult]);

  function minutesUntil(iso: string): number {
    return Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  }

  return (
    <div className="space-y-3">
      {matches.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/10">
          <div className="mb-3 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{t('heading')}</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{isPhoneOnly ? t('phoneOnlyDescription') : t('description')}</p>
            </div>
          </div>

          <div className="space-y-2">
            {matches.map((c) => {
              const displayName =
                locale === 'ar' && c.firstNameAr
                  ? `${c.firstNameAr}${c.lastNameAr ? ` ${c.lastNameAr}` : ''}`
                  : `${c.firstName} ${c.lastName}`;

              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-amber-200 bg-white px-3 py-2.5 dark:border-amber-800/40 dark:bg-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{displayName}</span>
                        {c.isAlreadyLinked && (
                          <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {t('alreadyInClinicBadge')}
                          </span>
                        )}
                        {c.isArchived && (
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {t('archivedBadge')}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span dir="ltr" className="font-mono">{c.mrn}</span>
                        {c.phone && <span dir="ltr">{c.phone}</span>}
                        {c.dateOfBirth && <span dir="ltr">{c.dateOfBirth}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.reasons.map((r) => (
                          <span key={r} className={`${REASON_BADGE_CLASS} ${REASON_COLORS[r]}`}>
                            {t(`reasons.${r}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/patients/${c.id}`}
                      onClick={(e) => {
                        if (guard.enabled) {
                          e.preventDefault();
                          guard.requestNavigate(() => router.push(`/dashboard/patients/${c.id}`));
                        }
                      }}
                      className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      {t('actions.viewPatient')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {platformCandidates.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-700/50 dark:bg-blue-900/10">
          <div className="mb-3 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">{t('platform.heading')}</p>
              <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">{t('platform.description')}</p>
            </div>
          </div>

          <div className="space-y-2">
            {platformCandidates.map((c, i) => {
              const displayName =
                locale === 'ar' && c.firstNameAr
                  ? `${c.firstNameAr}${c.lastNameArInitial ? ` ${c.lastNameArInitial}.` : ''}`
                  : `${c.firstName ?? ''}${c.lastNameInitial ? ` ${c.lastNameInitial}.` : ''}`.trim();

              return (
                <div
                  key={i}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2.5 dark:border-blue-800/40 dark:bg-card"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-foreground">{displayName || '—'}</span>
                    {c.phoneLastFour && (
                      <span className="text-xs text-muted-foreground" dir="ltr">···{c.phoneLastFour}</span>
                    )}
                    {c.birthYear && (
                      <span className="text-xs text-muted-foreground">{c.birthYear}</span>
                    )}
                    <span className={`${REASON_BADGE_CLASS} ${REASON_COLORS[c.matchReason]}`}>
                      {t(`platform.matchReason.${c.matchReason}`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {linkRequestResult ? (
            <div className="mt-3 rounded-lg border border-blue-300 bg-white p-3 dark:border-blue-700 dark:bg-card">
              <p className="mb-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
                {t('platform.codeSentTitle')}
              </p>
              <p className="mb-1 font-mono text-2xl font-bold tracking-widest text-foreground" dir="ltr">
                {linkRequestResult.code}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('platform.codeExpiry', { minutes: minutesUntil(linkRequestResult.expiresAt) })}
              </p>
              <p className="mt-1.5 text-xs text-blue-700 dark:text-blue-400">
                {t('platform.codeSentBody')}
              </p>
              <hr className="my-3 border-blue-100 dark:border-blue-800/40" />
              {verifySuccess ? (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950/30">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {t('platform.verifySuccess')}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300">
                    {t('platform.verifyCodeLabel')}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('platform.verifyCodePlaceholder')}
                      disabled={isVerifyingLink || isCreating}
                      className="h-9 w-32 rounded-md border bg-background px-3 font-mono text-sm tracking-widest outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => onVerifyLink?.(otpValue)}
                      disabled={otpValue.length !== 6 || isVerifyingLink || isCreating}
                      className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      {isVerifyingLink ? t('platform.verifyingButton') : t('platform.verifyButton')}
                    </button>
                  </div>
                  {verifyError && (
                    <p className="mt-1.5 text-xs text-destructive">{verifyError}</p>
                  )}
                  {onRequestLink && (
                    <button
                      type="button"
                      onClick={onRequestLink}
                      disabled={isRequestingLink || isCreating}
                      className="mt-2 text-xs text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400"
                    >
                      {t('platform.requestNewCode')}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : onRequestLink && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onRequestLink}
                disabled={isRequestingLink || isCreating}
                className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {isRequestingLink ? t('platform.pendingLink') : t('platform.requestLink')}
              </button>
              <p className="text-xs text-blue-600 dark:text-blue-400">{t('platform.requestLinkHint')}</p>
            </div>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-1">
          {anyLinked && (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {t('alreadyLinkedNote')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('confirmHelper')}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCreateAnyway}
          disabled={isCreating}
          className="inline-flex h-8 items-center rounded-md bg-amber-600 px-3 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          {t('actions.createAnyway')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tForm('actions.cancel')}
        </button>
      </div>
    </div>
  );
}
