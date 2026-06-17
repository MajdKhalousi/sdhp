'use client';

import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOnboardOrganization } from '@/hooks/use-organizations';
import type { OrganizationType } from '@/types/organization';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORG_TYPES: OrganizationType[] = ['HOSPITAL', 'CLINIC', 'POLYCLINIC'];

interface FormState {
  name: string;
  nameAr: string;
  type: OrganizationType;
  phone: string;
  email: string;
  address: string;
  branchName: string;
  branchNameAr: string;
  branchPhone: string;
  branchAddress: string;
  adminFirstName: string;
  adminLastName: string;
  adminFirstNameAr: string;
  adminLastNameAr: string;
  adminPhone: string;
  adminEmail: string;
  adminPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  branchName?: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminPhone?: string;
  adminEmail?: string;
  adminPassword?: string;
}

function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function NewPlatformOrganizationPage() {
  const t = useTranslations('platform.organizationNew');
  const router = useRouter();
  const { user } = useAuthStore();
  const onboard = useOnboardOrganization();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [values, setValues] = useState<FormState>({
    name: '',
    nameAr: '',
    type: 'CLINIC',
    phone: '',
    email: '',
    address: '',
    branchName: '',
    branchNameAr: '',
    branchPhone: '',
    branchAddress: '',
    adminFirstName: '',
    adminLastName: '',
    adminFirstNameAr: '',
    adminLastNameAr: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!user || !PLATFORM_ACCESS_ROLES.has(user.role)) return null;

  function set(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }) as FormErrors);
    setSubmitError(null);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.name.trim()) errs.name = t('validation.nameRequired');
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      errs.email = t('validation.emailFormat');
    }
    if (!values.branchName.trim()) errs.branchName = t('validation.branchNameRequired');
    if (!values.adminFirstName.trim()) errs.adminFirstName = t('validation.firstNameRequired');
    if (!values.adminLastName.trim()) errs.adminLastName = t('validation.lastNameRequired');
    if (!values.adminPhone.trim()) errs.adminPhone = t('validation.phoneRequired');
    if (values.adminEmail.trim() && !EMAIL_RE.test(values.adminEmail.trim())) {
      errs.adminEmail = t('validation.emailFormat');
    }
    if (values.adminPassword.length < 10) {
      errs.adminPassword = t('validation.passwordRequired');
    } else if (!/(?=.*[A-Za-z])/.test(values.adminPassword) || !/(?=.*\d)/.test(values.adminPassword)) {
      errs.adminPassword = t('validation.passwordFormat');
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
    setSubmitError(null);

    try {
      const response = await onboard.mutateAsync({
        name: values.name.trim(),
        nameAr: trimmedOrUndefined(values.nameAr),
        type: values.type,
        phone: trimmedOrUndefined(values.phone),
        email: trimmedOrUndefined(values.email),
        address: trimmedOrUndefined(values.address),
        initialBranch: {
          name: values.branchName.trim(),
          nameAr: trimmedOrUndefined(values.branchNameAr),
          phone: trimmedOrUndefined(values.branchPhone),
          address: trimmedOrUndefined(values.branchAddress),
        },
        initialAdmin: {
          firstName: values.adminFirstName.trim(),
          lastName: values.adminLastName.trim(),
          firstNameAr: trimmedOrUndefined(values.adminFirstNameAr),
          lastNameAr: trimmedOrUndefined(values.adminLastNameAr),
          phone: values.adminPhone.trim(),
          email: trimmedOrUndefined(values.adminEmail),
          password: values.adminPassword,
        },
      });
      router.replace(`/dashboard/platform/organizations/${response.organization.id}`);
    } catch (err) {
      if (err instanceof Error && err.name === 'ConflictError') {
        setSubmitError(err.message);
      } else {
        setSubmitError(err instanceof Error ? err.message : t('error.generic'));
      }
    }
  }

  const isPending = onboard.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Section 1: Organization Details */}
        <section className="space-y-4">
          <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
            {t('sections.organization')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>{t('fields.name')}</FieldLabel>
              <input
                type="text"
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputClass(!!errors.name)}
                disabled={isPending}
              />
              <FieldError message={errors.name} />
            </div>
            <div>
              <FieldLabel>{t('fields.nameAr')}</FieldLabel>
              <input
                type="text"
                value={values.nameAr}
                onChange={(e) => set('nameAr', e.target.value)}
                className={inputClass()}
                disabled={isPending}
                dir="rtl"
              />
            </div>
            <div>
              <FieldLabel required>{t('fields.type')}</FieldLabel>
              <select
                value={values.type}
                onChange={(e) => set('type', e.target.value)}
                className={inputClass()}
                disabled={isPending}
              >
                {ORG_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`types.${ty}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>{t('fields.phone')}</FieldLabel>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputClass()}
                disabled={isPending}
                dir="ltr"
              />
            </div>
            <div>
              <FieldLabel>{t('fields.email')}</FieldLabel>
              <input
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass(!!errors.email)}
                disabled={isPending}
                dir="ltr"
              />
              <FieldError message={errors.email} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>{t('fields.address')}</FieldLabel>
              <input
                type="text"
                value={values.address}
                onChange={(e) => set('address', e.target.value)}
                className={inputClass()}
                disabled={isPending}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Initial Branch */}
        <section className="space-y-4">
          <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
            {t('sections.branch')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>{t('fields.branchName')}</FieldLabel>
              <input
                type="text"
                value={values.branchName}
                onChange={(e) => set('branchName', e.target.value)}
                className={inputClass(!!errors.branchName)}
                disabled={isPending}
              />
              <FieldError message={errors.branchName} />
            </div>
            <div>
              <FieldLabel>{t('fields.branchNameAr')}</FieldLabel>
              <input
                type="text"
                value={values.branchNameAr}
                onChange={(e) => set('branchNameAr', e.target.value)}
                className={inputClass()}
                disabled={isPending}
                dir="rtl"
              />
            </div>
            <div>
              <FieldLabel>{t('fields.branchPhone')}</FieldLabel>
              <input
                type="tel"
                value={values.branchPhone}
                onChange={(e) => set('branchPhone', e.target.value)}
                className={inputClass()}
                disabled={isPending}
                dir="ltr"
              />
            </div>
            <div>
              <FieldLabel>{t('fields.branchAddress')}</FieldLabel>
              <input
                type="text"
                value={values.branchAddress}
                onChange={(e) => set('branchAddress', e.target.value)}
                className={inputClass()}
                disabled={isPending}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Initial Admin Account */}
        <section className="space-y-4">
          <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
            {t('sections.admin')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel required>{t('fields.adminFirstName')}</FieldLabel>
              <input
                type="text"
                value={values.adminFirstName}
                onChange={(e) => set('adminFirstName', e.target.value)}
                className={inputClass(!!errors.adminFirstName)}
                disabled={isPending}
              />
              <FieldError message={errors.adminFirstName} />
            </div>
            <div>
              <FieldLabel required>{t('fields.adminLastName')}</FieldLabel>
              <input
                type="text"
                value={values.adminLastName}
                onChange={(e) => set('adminLastName', e.target.value)}
                className={inputClass(!!errors.adminLastName)}
                disabled={isPending}
              />
              <FieldError message={errors.adminLastName} />
            </div>
            <div>
              <FieldLabel>{t('fields.adminFirstNameAr')}</FieldLabel>
              <input
                type="text"
                value={values.adminFirstNameAr}
                onChange={(e) => set('adminFirstNameAr', e.target.value)}
                className={inputClass()}
                disabled={isPending}
                dir="rtl"
              />
            </div>
            <div>
              <FieldLabel>{t('fields.adminLastNameAr')}</FieldLabel>
              <input
                type="text"
                value={values.adminLastNameAr}
                onChange={(e) => set('adminLastNameAr', e.target.value)}
                className={inputClass()}
                disabled={isPending}
                dir="rtl"
              />
            </div>
            <div>
              <FieldLabel required>{t('fields.adminPhone')}</FieldLabel>
              <input
                type="tel"
                value={values.adminPhone}
                onChange={(e) => set('adminPhone', e.target.value)}
                className={inputClass(!!errors.adminPhone)}
                disabled={isPending}
                dir="ltr"
              />
              <FieldError message={errors.adminPhone} />
            </div>
            <div>
              <FieldLabel>{t('fields.adminEmail')}</FieldLabel>
              <input
                type="email"
                value={values.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                className={inputClass(!!errors.adminEmail)}
                disabled={isPending}
                dir="ltr"
              />
              <FieldError message={errors.adminEmail} />
            </div>
            <div>
              <FieldLabel required>{t('fields.adminPassword')}</FieldLabel>
              <input
                type="password"
                value={values.adminPassword}
                onChange={(e) => set('adminPassword', e.target.value)}
                className={inputClass(!!errors.adminPassword)}
                disabled={isPending}
                autoComplete="new-password"
                dir="ltr"
              />
              <FieldError message={errors.adminPassword} />
              <p className="mt-1 text-xs text-muted-foreground">{t('fields.adminPasswordHint')}</p>
            </div>
          </div>
        </section>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? t('actions.creating') : t('actions.create')}
          </button>
          <Link
            href="/dashboard/platform/organizations"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t('actions.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
