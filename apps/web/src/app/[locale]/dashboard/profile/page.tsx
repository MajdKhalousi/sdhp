'use client';

import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeDisplay } from '@/lib/format-date';

interface MeResponse {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  organizationId: string;
  branchId: string | null;
  organization: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
    subscriptionStartAt: string | null;
    subscriptionEndAt: string | null;
    subscriptionPlan: string | null;
  } | null;
  branch: { id: string; name: string } | null;
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const { data: profile, isLoading, isError } = useQuery<MeResponse>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<MeResponse>('/v1/auth/me'),
    staleTime: 30_000,
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setClientError(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setClientError(t('changePassword.errors.required'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError(t('changePassword.errors.mismatch'));
      return;
    }
    if (newPassword.length < 10 || !/(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      setClientError(t('changePassword.errors.weak'));
      return;
    }

    setSubmitting(true);
    try {
      await api.patch<void>('/v1/auth/me/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccessMsg(t('changePassword.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        logout();
        router.replace('/login');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const lower = msg.toLowerCase();
      if (lower.includes('incorrect') || lower.includes('current password')) {
        setClientError(t('changePassword.errors.wrongCurrent'));
      } else if (lower.includes('match')) {
        setClientError(t('changePassword.errors.mismatch'));
      } else if (lower.includes('different') || lower.includes('same')) {
        setClientError(t('changePassword.errors.sameAsOld'));
      } else if (lower.includes('10') || lower.includes('letter') || lower.includes('number') || lower.includes('weak')) {
        setClientError(t('changePassword.errors.weak'));
      } else {
        setClientError(t('changePassword.errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-1 h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-destructive">{t('loadError')}</p>
      </div>
    );
  }

  const fullNameEn = `${profile.firstName} ${profile.lastName}`;
  const fullNameAr =
    profile.firstNameAr && profile.lastNameAr
      ? `${profile.firstNameAr} ${profile.lastNameAr}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Profile Info Card */}
      <div className="rounded-xl border bg-card p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField label={t('fields.name')} value={fullNameEn} />
          {fullNameAr && <ProfileField label={t('fields.nameAr')} value={fullNameAr} dir="rtl" />}
          <ProfileField label={t('fields.phone')} value={profile.phone} dir="ltr" />
          <ProfileField
            label={t('fields.email')}
            value={profile.email ?? t('fields.noEmail')}
          />
          <ProfileField label={t('fields.role')} value={formatRole(profile.role)} />
          <ProfileField
            label={t('fields.organization')}
            value={profile.organization?.name ?? profile.organizationId}
          />
          <ProfileField
            label={t('fields.branch')}
            value={profile.branch?.name ?? t('fields.noBranch')}
          />
          <ProfileField
            label={t('fields.status')}
            value={profile.isActive ? t('status.active') : t('status.inactive')}
            valueClassName={profile.isActive ? 'text-green-600' : 'text-destructive'}
          />
          <ProfileField
            label={t('fields.lastLogin')}
            value={profile.lastLoginAt ? formatDateTimeDisplay(profile.lastLoginAt) : t('fields.never')}
          />
        </dl>
      </div>

      {/* Change Password Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold">{t('changePassword.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('changePassword.subtitle')}</p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <PasswordField
            id="currentPassword"
            label={t('changePassword.fields.currentPassword')}
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={submitting}
          />
          <div className="space-y-1">
            <PasswordField
              id="newPassword"
              label={t('changePassword.fields.newPassword')}
              value={newPassword}
              onChange={setNewPassword}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {t('changePassword.hints.newPassword')}
            </p>
          </div>
          <PasswordField
            id="confirmPassword"
            label={t('changePassword.fields.confirmPassword')}
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={submitting}
          />

          {clientError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {clientError}
            </p>
          )}
          {successMsg && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? t('changePassword.actions.saving')
              : t('changePassword.actions.save')}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  dir,
  valueClassName,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
  valueClassName?: string;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium ${valueClassName ?? ''}`} dir={dir}>
        {value}
      </dd>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
    </div>
  );
}
