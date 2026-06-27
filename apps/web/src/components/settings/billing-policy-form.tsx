'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AppointmentPaymentPolicy, BillingPolicy, UpdateBillingPolicyDto } from '@/types/billing-policy';

const APPOINTMENT_PAYMENT_POLICIES: AppointmentPaymentPolicy[] = [
  'NONE',
  'OPTIONAL_PREPAYMENT',
  'DEPOSIT_REQUIRED',
  'FULL_PREPAYMENT_REQUIRED',
];

function inputClass(hasError?: boolean): string {
  const base =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2';
  return hasError
    ? `${base} border-destructive focus:ring-destructive/50`
    : `${base} border-input focus:ring-ring`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-foreground">{children}</label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-input'}`}
    >
      <span
        className={`pointer-events-none mt-0.5 ms-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

interface FormErrors {
  invoiceNumberPrefix?: string;
  freeFollowUpWindowDays?: string;
  followUpDiscountPercent?: string;
  defaultDueDateDays?: string;
  noShowFeeAmount?: string;
  appointmentDepositPercent?: string;
}

interface Props {
  policy: BillingPolicy;
  update: UseMutationResult<BillingPolicy, Error, UpdateBillingPolicyDto>;
}

export function BillingPolicyForm({ policy, update }: Props) {
  const t = useTranslations('settings.billing');

  const [values, setValues] = useState({
    autoCreateInvoiceOnCheckin: policy.autoCreateInvoiceOnCheckin,
    invoiceNumberPrefix: policy.invoiceNumberPrefix,
    freeFollowUpWindowDays: String(policy.freeFollowUpWindowDays),
    followUpDiscountPercent: String(policy.followUpDiscountPercent),
    requirePaymentBeforeEncounter: policy.requirePaymentBeforeEncounter,
    appointmentPaymentPolicy: policy.appointmentPaymentPolicy,
    appointmentDepositPercent: String(policy.appointmentDepositPercent),
    defaultDueDateDays: String(policy.defaultDueDateDays),
    noShowFeeAmount: String(policy.noShowFeeAmount),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setValues({
      autoCreateInvoiceOnCheckin: policy.autoCreateInvoiceOnCheckin,
      invoiceNumberPrefix: policy.invoiceNumberPrefix,
      freeFollowUpWindowDays: String(policy.freeFollowUpWindowDays),
      followUpDiscountPercent: String(policy.followUpDiscountPercent),
      requirePaymentBeforeEncounter: policy.requirePaymentBeforeEncounter,
      appointmentPaymentPolicy: policy.appointmentPaymentPolicy,
      appointmentDepositPercent: String(policy.appointmentDepositPercent),
      defaultDueDateDays: String(policy.defaultDueDateDays),
      noShowFeeAmount: String(policy.noShowFeeAmount),
    });
  }, [policy]);

  function set<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(false);
    setSaveError(null);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!/^[A-Z0-9]{1,6}$/.test(values.invoiceNumberPrefix)) {
      errs.invoiceNumberPrefix = t('validation.prefixFormat');
    }
    const window = parseInt(values.freeFollowUpWindowDays, 10);
    if (isNaN(window) || window < 0) errs.freeFollowUpWindowDays = t('validation.windowMin');
    const discount = parseFloat(values.followUpDiscountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100)
      errs.followUpDiscountPercent = t('validation.discountRange');
    const due = parseInt(values.defaultDueDateDays, 10);
    if (isNaN(due) || due < 0) errs.defaultDueDateDays = t('validation.dueDateMin');
    const fee = parseFloat(values.noShowFeeAmount);
    if (isNaN(fee) || fee < 0) errs.noShowFeeAmount = t('validation.noShowFeeMin');
    const deposit = parseFloat(values.appointmentDepositPercent);
    if (isNaN(deposit) || deposit < 0 || deposit > 100) {
      errs.appointmentDepositPercent = t('validation.depositRange');
    } else if (values.appointmentPaymentPolicy === 'DEPOSIT_REQUIRED' && deposit <= 0) {
      errs.appointmentDepositPercent = t('validation.depositRequiredPositive');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSuccess(false);
    setSaveError(null);
    try {
      await update.mutateAsync({
        autoCreateInvoiceOnCheckin: values.autoCreateInvoiceOnCheckin,
        invoiceNumberPrefix: values.invoiceNumberPrefix,
        freeFollowUpWindowDays: parseInt(values.freeFollowUpWindowDays, 10),
        followUpDiscountPercent: parseFloat(values.followUpDiscountPercent),
        requirePaymentBeforeEncounter: values.requirePaymentBeforeEncounter,
        appointmentPaymentPolicy: values.appointmentPaymentPolicy,
        appointmentDepositPercent: parseFloat(values.appointmentDepositPercent),
        defaultDueDateDays: parseInt(values.defaultDueDateDays, 10),
        noShowFeeAmount: parseFloat(values.noShowFeeAmount),
      });
      setSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    }
  }

  const isPending = update.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">

        {/* ── Invoice Settings ──────────────────────────────── */}
        <div>
          <SectionHeading>{t('sections.invoicing')}</SectionHeading>
          <div className="space-y-4">

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t('fields.autoCreateInvoiceOnCheckin')}</p>
                <p className="text-xs text-muted-foreground">{t('fields.autoCreateInvoiceOnCheckinHint')}</p>
              </div>
              <Toggle
                checked={values.autoCreateInvoiceOnCheckin}
                onChange={(v) => set('autoCreateInvoiceOnCheckin', v)}
                disabled={isPending}
              />
            </div>

            <div className="max-w-xs">
              <FieldLabel>{t('fields.invoiceNumberPrefix')}</FieldLabel>
              <input
                type="text"
                value={values.invoiceNumberPrefix}
                onChange={(e) => set('invoiceNumberPrefix', e.target.value.toUpperCase())}
                maxLength={6}
                className={inputClass(!!errors.invoiceNumberPrefix)}
                disabled={isPending}
                dir="ltr"
                placeholder="INV"
              />
              <FieldHint>{t('fields.invoiceNumberPrefixHint')}</FieldHint>
              <FieldError message={errors.invoiceNumberPrefix} />
            </div>

          </div>
        </div>

        {/* ── Follow-up Policy ──────────────────────────────── */}
        <div>
          <SectionHeading>{t('sections.followUp')}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel>{t('fields.freeFollowUpWindowDays')}</FieldLabel>
              <input
                type="number"
                min={0}
                max={365}
                value={values.freeFollowUpWindowDays}
                onChange={(e) => set('freeFollowUpWindowDays', e.target.value)}
                className={inputClass(!!errors.freeFollowUpWindowDays)}
                disabled={isPending}
                dir="ltr"
              />
              <FieldHint>{t('fields.freeFollowUpWindowDaysHint')}</FieldHint>
              <FieldError message={errors.freeFollowUpWindowDays} />
            </div>

            <div>
              <FieldLabel>{t('fields.followUpDiscountPercent')}</FieldLabel>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={values.followUpDiscountPercent}
                onChange={(e) => set('followUpDiscountPercent', e.target.value)}
                className={inputClass(!!errors.followUpDiscountPercent)}
                disabled={isPending}
                dir="ltr"
              />
              <FieldHint>{t('fields.followUpDiscountPercentHint')}</FieldHint>
              <FieldError message={errors.followUpDiscountPercent} />
            </div>

          </div>
        </div>

        {/* ── Encounter & Payment ───────────────────────────── */}
        <div>
          <SectionHeading>{t('sections.encounter')}</SectionHeading>
          <div className="space-y-4">

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t('fields.requirePaymentBeforeEncounter')}</p>
                <p className="text-xs text-muted-foreground">{t('fields.requirePaymentBeforeEncounterHint')}</p>
              </div>
              <Toggle
                checked={values.requirePaymentBeforeEncounter}
                onChange={(v) => set('requirePaymentBeforeEncounter', v)}
                disabled={isPending}
              />
            </div>

            <div className="max-w-xs">
              <FieldLabel>{t('fields.appointmentPaymentPolicy')}</FieldLabel>
              <select
                value={values.appointmentPaymentPolicy}
                onChange={(e) => set('appointmentPaymentPolicy', e.target.value as AppointmentPaymentPolicy)}
                className={inputClass()}
                disabled={isPending}
              >
                {APPOINTMENT_PAYMENT_POLICIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`fields.appointmentPaymentPolicyOptions.${opt}`)}
                  </option>
                ))}
              </select>
              <FieldHint>{t('fields.appointmentPaymentPolicyHint')}</FieldHint>
            </div>

            <div className="max-w-xs">
              <FieldLabel>{t('fields.appointmentDepositPercent')}</FieldLabel>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={values.appointmentDepositPercent}
                onChange={(e) => set('appointmentDepositPercent', e.target.value)}
                className={inputClass(!!errors.appointmentDepositPercent)}
                disabled={isPending || values.appointmentPaymentPolicy !== 'DEPOSIT_REQUIRED'}
                dir="ltr"
              />
              <FieldHint>{t('fields.appointmentDepositPercentHint')}</FieldHint>
              <FieldError message={errors.appointmentDepositPercent} />
            </div>

            <div className="max-w-xs">
              <FieldLabel>{t('fields.defaultDueDateDays')}</FieldLabel>
              <input
                type="number"
                min={0}
                max={365}
                value={values.defaultDueDateDays}
                onChange={(e) => set('defaultDueDateDays', e.target.value)}
                className={inputClass(!!errors.defaultDueDateDays)}
                disabled={isPending}
                dir="ltr"
              />
              <FieldHint>{t('fields.defaultDueDateDaysHint')}</FieldHint>
              <FieldError message={errors.defaultDueDateDays} />
            </div>

          </div>
        </div>

        {/* ── No-show Fee ───────────────────────────────────── */}
        <div>
          <SectionHeading>{t('sections.noShow')}</SectionHeading>
          <div className="max-w-xs">
            <FieldLabel>{t('fields.noShowFeeAmount')}</FieldLabel>
            <input
              type="number"
              min={0}
              step={0.01}
              value={values.noShowFeeAmount}
              onChange={(e) => set('noShowFeeAmount', e.target.value)}
              className={inputClass(!!errors.noShowFeeAmount)}
              disabled={isPending}
              dir="ltr"
            />
            <FieldHint>{t('fields.noShowFeeAmountHint')}</FieldHint>
            <FieldError message={errors.noShowFeeAmount} />
          </div>
        </div>

        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{t('success')}</p>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? t('actions.saving') : t('actions.save')}
          </button>
        </div>
      </div>
    </form>
  );
}
