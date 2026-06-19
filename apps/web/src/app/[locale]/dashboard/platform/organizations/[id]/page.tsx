'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import {
  useOrganization,
  useUpdateOrganization,
  useToggleOrganizationStatus,
  useUpdateOrganizationSubscription,
} from '@/hooks/use-organizations';
import { useBranches } from '@/hooks/use-branches';
import { useStaff } from '@/hooks/use-staff';
import { OrganizationAccountsSection } from '@/components/platform/organization-accounts-section';
import {
  useSubscriptionPayments,
  useCreateSubscriptionPayment,
  useUpdateSubscriptionPayment,
  useDeleteSubscriptionPayment,
} from '@/hooks/use-subscription-payments';
import { isDemoOrganization } from '@/lib/demo-organizations';
import {
  getOrganizationSubscriptionHealth,
  subscriptionHealthBadgeClass,
  subscriptionStatusBadgeClass,
} from '@/lib/subscription-health';
import type { OrganizationType, SubscriptionStatus } from '@/types/organization';
import type { SubscriptionPayment, SubscriptionPaymentMethod } from '@/types/subscription-payment';

function inputClass(hasError?: boolean): string {
  const base =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2';
  return hasError
    ? `${base} border-destructive focus:ring-destructive/50`
    : `${base} border-input focus:ring-ring`;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ms-1 text-destructive">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

const ORG_TYPES: OrganizationType[] = ['HOSPITAL', 'CLINIC', 'POLYCLINIC'];
const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];
const PAYMENT_METHODS: SubscriptionPaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE', 'OTHER'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

interface EditFormState {
  name: string;
  nameAr: string;
  type: OrganizationType;
  phone: string;
  email: string;
  address: string;
}

interface EditFormErrors {
  name?: string;
  email?: string;
}

interface SubscriptionFormState {
  status: SubscriptionStatus;
  plan: string;
  startAt: string;
  endAt: string;
  notes: string;
}

interface PaymentFormState {
  amount: string;
  currency: string;
  method: SubscriptionPaymentMethod;
  paidAt: string;
  periodStartAt: string;
  periodEndAt: string;
  reference: string;
  notes: string;
}

interface PaymentFormErrors {
  amount?: string;
  currency?: string;
  paidAt?: string;
}

function todayForInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultPaymentForm(): PaymentFormState {
  return {
    amount: '',
    currency: 'SYP',
    method: 'CASH',
    paidAt: todayForInput(),
    periodStartAt: '',
    periodEndAt: '',
    reference: '',
    notes: '',
  };
}

function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Backend returns ISO datetime strings; <input type="date"> needs YYYY-MM-DD.
function isoDateForInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

// Empty date input clears the field (null); a filled date is sent as UTC midnight.
function dateInputToIso(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

// For create only: an empty optional date means "not provided" (undefined),
// not "clear" — there is nothing to clear yet.
function optionalDateInputToIso(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function paymentToFormState(payment: SubscriptionPayment): PaymentFormState {
  return {
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    paidAt: isoDateForInput(payment.paidAt),
    periodStartAt: isoDateForInput(payment.periodStartAt),
    periodEndAt: isoDateForInput(payment.periodEndAt),
    reference: payment.reference ?? '',
    notes: payment.notes ?? '',
  };
}


export default function PlatformOrganizationDetailPage() {
  const t = useTranslations('platform.organizationDetail');
  const tDemo = useTranslations('platform.demo');
  const locale = useLocale();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const isSuperAdmin = !!user && PLATFORM_ACCESS_ROLES.has(user.role);

  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError,
  } = useOrganization(id);

  const { data: allBranches = [], isLoading: branchesLoading } = useBranches();
  const { data: allUsers = [], isLoading: usersLoading } = useStaff(true);
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useSubscriptionPayments(id);

  const updateOrganization = useUpdateOrganization();
  const toggleStatus = useToggleOrganizationStatus();
  const updateSubscription = useUpdateOrganizationSubscription();
  const createPayment = useCreateSubscriptionPayment(id);
  const updatePayment = useUpdateSubscriptionPayment(id);
  const deletePayment = useDeleteSubscriptionPayment(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<EditFormState>({
    name: '',
    nameAr: '',
    type: 'CLINIC',
    phone: '',
    email: '',
    address: '',
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);

  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [subscriptionValues, setSubscriptionValues] = useState<SubscriptionFormState>({
    status: 'ACTIVE',
    plan: '',
    startAt: '',
    endAt: '',
    notes: '',
  });
  const [subscriptionSubmitError, setSubscriptionSubmitError] = useState<string | null>(null);

  const [paymentValues, setPaymentValues] = useState<PaymentFormState>(defaultPaymentForm());
  const [paymentErrors, setPaymentErrors] = useState<PaymentFormErrors>({});
  const [paymentSubmitError, setPaymentSubmitError] = useState<string | null>(null);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentValues, setEditPaymentValues] = useState<PaymentFormState>(defaultPaymentForm());
  const [editPaymentErrors, setEditPaymentErrors] = useState<PaymentFormErrors>({});
  const [editPaymentSubmitError, setEditPaymentSubmitError] = useState<string | null>(null);

  const [confirmingDeletePaymentId, setConfirmingDeletePaymentId] = useState<string | null>(null);
  const [deletePaymentError, setDeletePaymentError] = useState<string | null>(null);

  if (!user || !isSuperAdmin) return null;

  function startEdit() {
    if (!org) return;
    setEditValues({
      name: org.name,
      nameAr: org.nameAr ?? '',
      type: org.type,
      phone: org.phone ?? '',
      email: org.email ?? '',
      address: org.address ?? '',
    });
    setEditErrors({});
    setEditSubmitError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditErrors({});
    setEditSubmitError(null);
  }

  function setEditField(field: keyof EditFormState, value: string) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: undefined }) as EditFormErrors);
    setEditSubmitError(null);
  }

  function validateEdit(): EditFormErrors {
    const errs: EditFormErrors = {};
    if (!editValues.name.trim()) errs.name = t('edit.validation.nameRequired');
    if (editValues.email.trim() && !EMAIL_RE.test(editValues.email.trim())) {
      errs.email = t('edit.validation.emailFormat');
    }
    return errs;
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditSubmitError(null);
    try {
      await updateOrganization.mutateAsync({
        id,
        dto: {
          name: editValues.name.trim(),
          nameAr: trimmedOrUndefined(editValues.nameAr),
          type: editValues.type,
          phone: trimmedOrUndefined(editValues.phone),
          email: trimmedOrUndefined(editValues.email),
          address: trimmedOrUndefined(editValues.address),
        },
      });
      setIsEditing(false);
    } catch (err) {
      setEditSubmitError(err instanceof Error ? err.message : t('edit.error.generic'));
    }
  }

  async function handleSuspendConfirm() {
    setStatusError(null);
    try {
      await toggleStatus.mutateAsync({ id, isActive: false });
      setConfirmingSuspend(false);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('status.error.generic'));
    }
  }

  async function handleActivate() {
    setStatusError(null);
    try {
      await toggleStatus.mutateAsync({ id, isActive: true });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('status.error.generic'));
    }
  }

  function startSubscriptionEdit() {
    if (!org) return;
    setSubscriptionValues({
      status: org.subscriptionStatus,
      plan: org.subscriptionPlan ?? '',
      startAt: isoDateForInput(org.subscriptionStartAt),
      endAt: isoDateForInput(org.subscriptionEndAt),
      notes: org.subscriptionNotes ?? '',
    });
    setSubscriptionSubmitError(null);
    setIsEditingSubscription(true);
  }

  function cancelSubscriptionEdit() {
    setIsEditingSubscription(false);
    setSubscriptionSubmitError(null);
  }

  function setSubscriptionField(field: keyof SubscriptionFormState, value: string) {
    setSubscriptionValues((prev) => ({ ...prev, [field]: value }));
    setSubscriptionSubmitError(null);
  }

  async function handleSubscriptionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubscriptionSubmitError(null);
    try {
      await updateSubscription.mutateAsync({
        id,
        dto: {
          subscriptionStatus: subscriptionValues.status,
          subscriptionPlan: trimmedOrNull(subscriptionValues.plan),
          subscriptionStartAt: dateInputToIso(subscriptionValues.startAt),
          subscriptionEndAt: dateInputToIso(subscriptionValues.endAt),
          subscriptionNotes: trimmedOrNull(subscriptionValues.notes),
        },
      });
      setIsEditingSubscription(false);
    } catch (err) {
      setSubscriptionSubmitError(err instanceof Error ? err.message : t('subscription.error.generic'));
    }
  }

  function setPaymentField(field: keyof PaymentFormState, value: string) {
    setPaymentValues((prev) => ({ ...prev, [field]: value }));
    setPaymentErrors((prev) => ({ ...prev, [field]: undefined }) as PaymentFormErrors);
    setPaymentSubmitError(null);
  }

  function validatePayment(): PaymentFormErrors {
    const errs: PaymentFormErrors = {};
    const amountNum = Number(paymentValues.amount);
    if (!paymentValues.amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      errs.amount = t('subscriptionPayments.addForm.validation.amountRequired');
    }
    const currency = paymentValues.currency.trim().toUpperCase();
    if (!CURRENCY_RE.test(currency)) {
      errs.currency = t('subscriptionPayments.addForm.validation.currencyFormat');
    }
    return errs;
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validatePayment();
    if (Object.keys(errs).length > 0) {
      setPaymentErrors(errs);
      return;
    }
    setPaymentSubmitError(null);
    try {
      await createPayment.mutateAsync({
        amount: Number(paymentValues.amount),
        currency: paymentValues.currency.trim().toUpperCase(),
        method: paymentValues.method,
        paidAt: optionalDateInputToIso(paymentValues.paidAt),
        periodStartAt: optionalDateInputToIso(paymentValues.periodStartAt),
        periodEndAt: optionalDateInputToIso(paymentValues.periodEndAt),
        reference: trimmedOrUndefined(paymentValues.reference),
        notes: trimmedOrUndefined(paymentValues.notes),
      });
      setPaymentValues(defaultPaymentForm());
      setPaymentErrors({});
    } catch (err) {
      setPaymentSubmitError(err instanceof Error ? err.message : t('subscriptionPayments.addForm.error.generic'));
    }
  }

  function startEditPayment(payment: SubscriptionPayment) {
    setConfirmingDeletePaymentId(null);
    setDeletePaymentError(null);
    setEditingPaymentId(payment.id);
    setEditPaymentValues(paymentToFormState(payment));
    setEditPaymentErrors({});
    setEditPaymentSubmitError(null);
  }

  function cancelEditPayment() {
    setEditingPaymentId(null);
    setEditPaymentErrors({});
    setEditPaymentSubmitError(null);
  }

  function setEditPaymentField(field: keyof PaymentFormState, value: string) {
    setEditPaymentValues((prev) => ({ ...prev, [field]: value }));
    setEditPaymentErrors((prev) => ({ ...prev, [field]: undefined }) as PaymentFormErrors);
    setEditPaymentSubmitError(null);
  }

  function validateEditPayment(): PaymentFormErrors {
    const errs: PaymentFormErrors = {};
    const amountNum = Number(editPaymentValues.amount);
    if (!editPaymentValues.amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      errs.amount = t('subscriptionPayments.editForm.validation.amountRequired');
    }
    const currency = editPaymentValues.currency.trim().toUpperCase();
    if (!CURRENCY_RE.test(currency)) {
      errs.currency = t('subscriptionPayments.editForm.validation.currencyFormat');
    }
    if (!editPaymentValues.paidAt.trim()) {
      errs.paidAt = t('subscriptionPayments.editForm.validation.paidAtRequired');
    }
    return errs;
  }

  async function handleEditPaymentSubmit(e: React.FormEvent, paymentId: string) {
    e.preventDefault();
    const errs = validateEditPayment();
    if (Object.keys(errs).length > 0) {
      setEditPaymentErrors(errs);
      return;
    }
    setEditPaymentSubmitError(null);
    try {
      await updatePayment.mutateAsync({
        paymentId,
        dto: {
          amount: Number(editPaymentValues.amount),
          currency: editPaymentValues.currency.trim().toUpperCase(),
          method: editPaymentValues.method,
          paidAt: dateInputToIso(editPaymentValues.paidAt) as string,
          periodStartAt: dateInputToIso(editPaymentValues.periodStartAt),
          periodEndAt: dateInputToIso(editPaymentValues.periodEndAt),
          reference: trimmedOrNull(editPaymentValues.reference),
          notes: trimmedOrNull(editPaymentValues.notes),
        },
      });
      setEditingPaymentId(null);
    } catch (err) {
      setEditPaymentSubmitError(err instanceof Error ? err.message : t('subscriptionPayments.editForm.error.generic'));
    }
  }

  function startDeletePayment(paymentId: string) {
    setEditingPaymentId(null);
    setDeletePaymentError(null);
    setConfirmingDeletePaymentId(paymentId);
  }

  function cancelDeletePayment() {
    setConfirmingDeletePaymentId(null);
    setDeletePaymentError(null);
  }

  async function handleConfirmDeletePayment(paymentId: string) {
    setDeletePaymentError(null);
    try {
      await deletePayment.mutateAsync(paymentId);
      setConfirmingDeletePaymentId(null);
    } catch (err) {
      setDeletePaymentError(err instanceof Error ? err.message : t('subscriptionPayments.delete.error.generic'));
    }
  }

  function formatPeriod(payment: { periodStartAt: string | null; periodEndAt: string | null }): string {
    const start = payment.periodStartAt ? new Date(payment.periodStartAt).toLocaleDateString() : null;
    const end = payment.periodEndAt ? new Date(payment.periodEndAt).toLocaleDateString() : null;
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
    if (end) return end;
    return '—';
  }

  function recordedByName(createdByUserId: string): string {
    const match = allUsers.find((candidate) => candidate.id === createdByUserId);
    return match ? `${match.firstName} ${match.lastName}` : '—';
  }

  const branches = allBranches.filter((b) => b.organizationId === id);
  const orgUsers = allUsers.filter((u) => u.organizationId === id);
  const orgAdmins = orgUsers.filter((u) => u.role === 'ORG_ADMIN');
  const staffUsers = orgUsers.filter(
    (u) => u.role !== 'ORG_ADMIN' && u.role !== 'SUPER_ADMIN',
  );
  const activeStaffCount = staffUsers.filter(
    (u) => u.isActive && !u.deletedAt,
  ).length;

  const dataLoading = orgLoading || branchesLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/platform/organizations"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('back')}
        </Link>
      </div>

      {dataLoading && !orgError && (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}

      {orgError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{t('notFound')}</p>
        </div>
      )}

      {!orgLoading && !orgError && org && (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
              {org.nameAr && (
                <p className="mt-0.5 text-base text-muted-foreground">{org.nameAr}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isDemoOrganization(org.id) && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  {tDemo('badge')}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {org.type}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  org.isActive
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {org.isActive ? t('status.active') : t('status.inactive')}
              </span>
            </div>
          </div>

          {/* Profile card */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t('sections.profile')}</h2>
              {!isEditing && (
                <button
                  onClick={startEdit}
                  className="h-7 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {t('edit.editButton')}
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('fields.name')}: </span>
                  <span className="text-foreground">{org.name}</span>
                </div>
                {org.nameAr && (
                  <div>
                    <span className="text-muted-foreground">{t('fields.nameAr')}: </span>
                    <span className="text-foreground">{org.nameAr}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('fields.type')}: </span>
                  <span className="text-foreground">{org.type}</span>
                </div>
                {org.phone && (
                  <div>
                    <span className="text-muted-foreground">{t('fields.phone')}: </span>
                    <span className="text-foreground">{org.phone}</span>
                  </div>
                )}
                {org.email && (
                  <div>
                    <span className="text-muted-foreground">{t('fields.email')}: </span>
                    <span className="text-foreground">{org.email}</span>
                  </div>
                )}
                {org.address && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">{t('fields.address')}: </span>
                    <span className="text-foreground">{org.address}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('fields.registered')}: </span>
                  <span className="text-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>{t('edit.fields.name')}</FieldLabel>
                    <input
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditField('name', e.target.value)}
                      className={inputClass(!!editErrors.name)}
                      disabled={updateOrganization.isPending}
                    />
                    <FieldError message={editErrors.name} />
                  </div>
                  <div>
                    <FieldLabel>{t('edit.fields.nameAr')}</FieldLabel>
                    <input
                      type="text"
                      value={editValues.nameAr}
                      onChange={(e) => setEditField('nameAr', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <FieldLabel required>{t('edit.fields.type')}</FieldLabel>
                    <select
                      value={editValues.type}
                      onChange={(e) => setEditField('type', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                    >
                      {ORG_TYPES.map((ty) => (
                        <option key={ty} value={ty}>
                          {t(`edit.types.${ty}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>{t('edit.fields.phone')}</FieldLabel>
                    <input
                      type="tel"
                      value={editValues.phone}
                      onChange={(e) => setEditField('phone', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('edit.fields.email')}</FieldLabel>
                    <input
                      type="email"
                      value={editValues.email}
                      onChange={(e) => setEditField('email', e.target.value)}
                      className={inputClass(!!editErrors.email)}
                      disabled={updateOrganization.isPending}
                      dir="ltr"
                    />
                    <FieldError message={editErrors.email} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>{t('edit.fields.address')}</FieldLabel>
                    <input
                      type="text"
                      value={editValues.address}
                      onChange={(e) => setEditField('address', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                    />
                  </div>
                </div>

                {editSubmitError && <p className="text-sm text-destructive">{editSubmitError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={updateOrganization.isPending}
                    className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {updateOrganization.isPending ? t('edit.saving') : t('edit.save')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={updateOrganization.isPending}
                    className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {t('edit.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Status control */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{t('status.sectionTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {org.isActive ? t('status.currentlyActive') : t('status.currentlyInactive')}
            </p>

            {statusError && <p className="text-sm text-destructive">{statusError}</p>}

            {org.isActive ? (
              !confirmingSuspend ? (
                <button
                  onClick={() => setConfirmingSuspend(true)}
                  className="h-8 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  {t('status.suspendButton')}
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-foreground">{t('status.suspendWarning')}</p>
                  <p className="text-sm font-medium text-destructive">{t('status.confirmSuspendPrompt')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSuspendConfirm}
                      disabled={toggleStatus.isPending}
                      className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                    >
                      {toggleStatus.isPending ? t('status.suspending') : t('status.confirmSuspend')}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingSuspend(false);
                        setStatusError(null);
                      }}
                      disabled={toggleStatus.isPending}
                      className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {t('status.cancel')}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <button
                onClick={handleActivate}
                disabled={toggleStatus.isPending}
                className="h-8 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {toggleStatus.isPending ? t('status.activating') : t('status.activateButton')}
              </button>
            )}
          </div>

          {/* Subscription card */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t('subscription.sectionTitle')}</h2>
              {!isEditingSubscription && (
                <button
                  onClick={startSubscriptionEdit}
                  className="h-7 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {t('subscription.editButton')}
                </button>
              )}
            </div>

            {!isEditingSubscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">{t('subscription.health.label')}: </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${subscriptionHealthBadgeClass(getOrganizationSubscriptionHealth(org))}`}
                  >
                    {t(`subscription.health.${getOrganizationSubscriptionHealth(org)}`)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('subscription.fields.status')}: </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${subscriptionStatusBadgeClass(org.subscriptionStatus)}`}
                  >
                    {t(`subscription.statusValues.${org.subscriptionStatus}`)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('subscription.fields.plan')}: </span>
                  <span className="text-foreground">{org.subscriptionPlan ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('subscription.fields.startAt')}: </span>
                  <span className="text-foreground">
                    {org.subscriptionStartAt ? new Date(org.subscriptionStartAt).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('subscription.fields.endAt')}: </span>
                  <span className="text-foreground">
                    {org.subscriptionEndAt ? new Date(org.subscriptionEndAt).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">{t('subscription.fields.notes')}: </span>
                  <span className="text-foreground">{org.subscriptionNotes ?? '—'}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubscriptionSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>{t('subscription.fields.status')}</FieldLabel>
                    <select
                      value={subscriptionValues.status}
                      onChange={(e) => setSubscriptionField('status', e.target.value)}
                      className={inputClass()}
                      disabled={updateSubscription.isPending}
                    >
                      {SUBSCRIPTION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`subscription.statusValues.${s}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>{t('subscription.fields.plan')}</FieldLabel>
                    <input
                      type="text"
                      value={subscriptionValues.plan}
                      onChange={(e) => setSubscriptionField('plan', e.target.value)}
                      className={inputClass()}
                      disabled={updateSubscription.isPending}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('subscription.fields.startAt')}</FieldLabel>
                    <input
                      type="date"
                      value={subscriptionValues.startAt}
                      onChange={(e) => setSubscriptionField('startAt', e.target.value)}
                      className={inputClass()}
                      disabled={updateSubscription.isPending}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('subscription.fields.endAt')}</FieldLabel>
                    <input
                      type="date"
                      value={subscriptionValues.endAt}
                      onChange={(e) => setSubscriptionField('endAt', e.target.value)}
                      className={inputClass()}
                      disabled={updateSubscription.isPending}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>{t('subscription.fields.notes')}</FieldLabel>
                    <textarea
                      value={subscriptionValues.notes}
                      onChange={(e) => setSubscriptionField('notes', e.target.value)}
                      className={inputClass()}
                      disabled={updateSubscription.isPending}
                      rows={3}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{t('subscription.helperText')}</p>

                {subscriptionSubmitError && (
                  <p className="text-sm text-destructive">{subscriptionSubmitError}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={updateSubscription.isPending}
                    className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {updateSubscription.isPending ? t('subscription.saving') : t('subscription.save')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelSubscriptionEdit}
                    disabled={updateSubscription.isPending}
                    className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {t('subscription.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Subscription Payments card */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">{t('subscriptionPayments.sectionTitle')}</h2>

            {paymentsLoading && (
              <p className="text-sm text-muted-foreground">{t('subscriptionPayments.loading')}</p>
            )}

            {!paymentsLoading && paymentsError && (
              <p className="text-sm text-destructive">{t('subscriptionPayments.addForm.error.generic')}</p>
            )}

            {!paymentsLoading && !paymentsError && payments.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('subscriptionPayments.empty')}</p>
            )}

            {!paymentsLoading && !paymentsError && payments.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.paidAt')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.amount')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.method')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.period')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.reference')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.notes')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.recordedBy')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.recordedAt')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('subscriptionPayments.columns.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((payment) => (
                      <Fragment key={payment.id}>
                        <tr className="bg-background">
                          <td className="px-4 py-3 text-foreground">
                            {new Date(payment.paidAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {payment.amount} {payment.currency}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {t(`subscriptionPayments.methods.${payment.method}`)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatPeriod(payment)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{payment.reference ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{payment.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{recordedByName(payment.createdByUserId)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditPayment(payment)}
                                className="h-7 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent"
                              >
                                {t('subscriptionPayments.editButton')}
                              </button>
                              <a
                                href={`/${locale}/subscription-payments/${id}/${payment.id}/print`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent"
                              >
                                {t('subscriptionPayments.receiptButton')}
                              </a>
                              <button
                                type="button"
                                onClick={() => startDeletePayment(payment.id)}
                                className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                              >
                                {t('subscriptionPayments.deleteButton')}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {editingPaymentId === payment.id && (
                          <tr key={`${payment.id}-edit`} className="bg-muted/30">
                            <td colSpan={9} className="px-4 py-4">
                              <form
                                onSubmit={(e) => handleEditPaymentSubmit(e, payment.id)}
                                noValidate
                                className="space-y-4"
                              >
                                <h3 className="text-sm font-semibold text-foreground">
                                  {t('subscriptionPayments.editForm.title')}
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                  <div>
                                    <FieldLabel required>{t('subscriptionPayments.editForm.fields.amount')}</FieldLabel>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      value={editPaymentValues.amount}
                                      onChange={(e) => setEditPaymentField('amount', e.target.value)}
                                      className={inputClass(!!editPaymentErrors.amount)}
                                      disabled={updatePayment.isPending}
                                    />
                                    <FieldError message={editPaymentErrors.amount} />
                                  </div>
                                  <div>
                                    <FieldLabel required>{t('subscriptionPayments.editForm.fields.currency')}</FieldLabel>
                                    <input
                                      type="text"
                                      value={editPaymentValues.currency}
                                      onChange={(e) => setEditPaymentField('currency', e.target.value)}
                                      className={inputClass(!!editPaymentErrors.currency)}
                                      disabled={updatePayment.isPending}
                                      dir="ltr"
                                    />
                                    <FieldError message={editPaymentErrors.currency} />
                                  </div>
                                  <div>
                                    <FieldLabel required>{t('subscriptionPayments.editForm.fields.method')}</FieldLabel>
                                    <select
                                      value={editPaymentValues.method}
                                      onChange={(e) => setEditPaymentField('method', e.target.value)}
                                      className={inputClass()}
                                      disabled={updatePayment.isPending}
                                    >
                                      {PAYMENT_METHODS.map((m) => (
                                        <option key={m} value={m}>
                                          {t(`subscriptionPayments.methods.${m}`)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <FieldLabel required>{t('subscriptionPayments.editForm.fields.paidAt')}</FieldLabel>
                                    <input
                                      type="date"
                                      value={editPaymentValues.paidAt}
                                      onChange={(e) => setEditPaymentField('paidAt', e.target.value)}
                                      className={inputClass(!!editPaymentErrors.paidAt)}
                                      disabled={updatePayment.isPending}
                                    />
                                    <FieldError message={editPaymentErrors.paidAt} />
                                  </div>
                                  <div>
                                    <FieldLabel>{t('subscriptionPayments.editForm.fields.periodStartAt')}</FieldLabel>
                                    <input
                                      type="date"
                                      value={editPaymentValues.periodStartAt}
                                      onChange={(e) => setEditPaymentField('periodStartAt', e.target.value)}
                                      className={inputClass()}
                                      disabled={updatePayment.isPending}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>{t('subscriptionPayments.editForm.fields.periodEndAt')}</FieldLabel>
                                    <input
                                      type="date"
                                      value={editPaymentValues.periodEndAt}
                                      onChange={(e) => setEditPaymentField('periodEndAt', e.target.value)}
                                      className={inputClass()}
                                      disabled={updatePayment.isPending}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>{t('subscriptionPayments.editForm.fields.reference')}</FieldLabel>
                                    <input
                                      type="text"
                                      value={editPaymentValues.reference}
                                      onChange={(e) => setEditPaymentField('reference', e.target.value)}
                                      className={inputClass()}
                                      disabled={updatePayment.isPending}
                                    />
                                  </div>
                                  <div className="sm:col-span-2 lg:col-span-4">
                                    <FieldLabel>{t('subscriptionPayments.editForm.fields.notes')}</FieldLabel>
                                    <textarea
                                      value={editPaymentValues.notes}
                                      onChange={(e) => setEditPaymentField('notes', e.target.value)}
                                      className={inputClass()}
                                      disabled={updatePayment.isPending}
                                      rows={2}
                                    />
                                  </div>
                                </div>

                                {editPaymentSubmitError && (
                                  <p className="text-sm text-destructive">{editPaymentSubmitError}</p>
                                )}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="submit"
                                    disabled={updatePayment.isPending}
                                    className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                                  >
                                    {updatePayment.isPending
                                      ? t('subscriptionPayments.editForm.saving')
                                      : t('subscriptionPayments.editForm.save')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditPayment}
                                    disabled={updatePayment.isPending}
                                    className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                                  >
                                    {t('subscriptionPayments.editForm.cancel')}
                                  </button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}

                        {confirmingDeletePaymentId === payment.id && (
                          <tr key={`${payment.id}-delete`} className="bg-destructive/5">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                                <p className="text-sm font-medium text-foreground">
                                  {t('subscriptionPayments.delete.confirmTitle')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t('subscriptionPayments.delete.warning')}
                                </p>
                                {deletePaymentError && (
                                  <p className="text-sm text-destructive">{deletePaymentError}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDeletePayment(payment.id)}
                                    disabled={deletePayment.isPending}
                                    className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                                  >
                                    {deletePayment.isPending
                                      ? t('subscriptionPayments.delete.deleting')
                                      : t('subscriptionPayments.delete.confirmButton')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelDeletePayment}
                                    disabled={deletePayment.isPending}
                                    className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                                  >
                                    {t('subscriptionPayments.delete.cancel')}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t('subscriptionPayments.addForm.title')}</h3>
              <form onSubmit={handlePaymentSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <FieldLabel required>{t('subscriptionPayments.addForm.fields.amount')}</FieldLabel>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentValues.amount}
                      onChange={(e) => setPaymentField('amount', e.target.value)}
                      className={inputClass(!!paymentErrors.amount)}
                      disabled={createPayment.isPending}
                    />
                    <FieldError message={paymentErrors.amount} />
                  </div>
                  <div>
                    <FieldLabel required>{t('subscriptionPayments.addForm.fields.currency')}</FieldLabel>
                    <input
                      type="text"
                      value={paymentValues.currency}
                      onChange={(e) => setPaymentField('currency', e.target.value)}
                      className={inputClass(!!paymentErrors.currency)}
                      disabled={createPayment.isPending}
                      dir="ltr"
                    />
                    <FieldError message={paymentErrors.currency} />
                  </div>
                  <div>
                    <FieldLabel required>{t('subscriptionPayments.addForm.fields.method')}</FieldLabel>
                    <select
                      value={paymentValues.method}
                      onChange={(e) => setPaymentField('method', e.target.value)}
                      className={inputClass()}
                      disabled={createPayment.isPending}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {t(`subscriptionPayments.methods.${m}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>{t('subscriptionPayments.addForm.fields.paidAt')}</FieldLabel>
                    <input
                      type="date"
                      value={paymentValues.paidAt}
                      onChange={(e) => setPaymentField('paidAt', e.target.value)}
                      className={inputClass()}
                      disabled={createPayment.isPending}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('subscriptionPayments.addForm.fields.periodStartAt')}</FieldLabel>
                    <input
                      type="date"
                      value={paymentValues.periodStartAt}
                      onChange={(e) => setPaymentField('periodStartAt', e.target.value)}
                      className={inputClass()}
                      disabled={createPayment.isPending}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('subscriptionPayments.addForm.fields.periodEndAt')}</FieldLabel>
                    <input
                      type="date"
                      value={paymentValues.periodEndAt}
                      onChange={(e) => setPaymentField('periodEndAt', e.target.value)}
                      className={inputClass()}
                      disabled={createPayment.isPending}
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('subscriptionPayments.addForm.fields.reference')}</FieldLabel>
                    <input
                      type="text"
                      value={paymentValues.reference}
                      onChange={(e) => setPaymentField('reference', e.target.value)}
                      className={inputClass()}
                      disabled={createPayment.isPending}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <FieldLabel>{t('subscriptionPayments.addForm.fields.notes')}</FieldLabel>
                    <textarea
                      value={paymentValues.notes}
                      onChange={(e) => setPaymentField('notes', e.target.value)}
                      className={inputClass()}
                      disabled={createPayment.isPending}
                      rows={2}
                    />
                  </div>
                </div>

                {paymentSubmitError && <p className="text-sm text-destructive">{paymentSubmitError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={createPayment.isPending}
                    className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {createPayment.isPending
                      ? t('subscriptionPayments.addForm.saving')
                      : t('subscriptionPayments.addForm.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('stats.branches'), value: branches.length },
              { label: t('stats.totalUsers'), value: orgUsers.length },
              { label: t('stats.orgAdmins'), value: orgAdmins.length },
              { label: t('stats.activeStaff'), value: activeStaffCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-3 text-center"
              >
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Branches table */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('sections.branches')}</h2>
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noBranches')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.name')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.phone')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.address')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.status')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.createdAt')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((branch) => (
                      <tr key={branch.id} className="bg-background">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{branch.name}</p>
                          {branch.nameAr && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{branch.nameAr}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {branch.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {branch.address ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              branch.isActive
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {branch.isActive ? t('status.active') : t('status.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(branch.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Accounts section */}
          <OrganizationAccountsSection organizationId={id} />

          {/* Limit note */}
          <p className="text-xs text-muted-foreground">{t('limitNote')}</p>
        </>
      )}
    </div>
  );
}
