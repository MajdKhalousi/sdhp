'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useEmployee } from '@/hooks/use-employees';
import { useBranches } from '@/hooks/use-branches';
import { useDepartments } from '@/hooks/use-departments';
import { useEmployeeDocuments, useEmployeeDocumentDownloadUrl } from '@/hooks/use-employee-documents';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount } from '@/lib/format-currency';
import { formatDateDisplay, formatDateTimeDisplay } from '@/lib/format-date';
import type { EmploymentStatus } from '@/types/employee';

function StatusBadge({ status, t }: { status: EmploymentStatus; t: (key: string) => string }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'ON_LEAVE' ? 'warning' : 'outline';
  return <Badge variant={variant}>{t(`form.employmentStatusOptions.${status}`)}</Badge>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, dir }: { label: string; value: React.ReactNode; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-end" dir={dir}>{value ?? '—'}</span>
    </div>
  );
}

const BACK_HREF = '/dashboard/hr/employees';

export function EmployeeProfileDetail({ employeeId }: { employeeId: string }) {
  const t = useTranslations('hr.detail');
  const tEmployees = useTranslations('settings.employees');
  const locale = useLocale();

  const { data: emp, isLoading, isError, error } = useEmployee(employeeId);
  const { data: branches } = useBranches();
  const { data: departments } = useDepartments();
  const { data: documents, isLoading: docsLoading, isError: docsError } = useEmployeeDocuments(employeeId);
  const downloadUrlMutation = useEmployeeDocumentDownloadUrl();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(documentId: string) {
    setDownloadError(null);
    setDownloadingId(documentId);
    try {
      const result = await downloadUrlMutation.mutateAsync({ employeeProfileId: employeeId, documentId });
      window.open(result.downloadUrl, '_blank');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : t('documents.downloadFailed'));
    } finally {
      setDownloadingId(null);
    }
  }

  const backLink = (
    <Link
      href={BACK_HREF}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-accent"
      aria-label={t('backToEmployees')}
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
    </Link>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !emp) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {backLink}
          <h1 className="text-lg font-semibold">{t('errors.notFound')}</h1>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : ''}
          </p>
        </div>
      </div>
    );
  }

  const isDeactivated = !!emp.deletedAt;
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const fullNameAr = [emp.firstNameAr, emp.lastNameAr].filter(Boolean).join(' ');
  const branchName = emp.branchId ? branches?.find((b) => b.id === emp.branchId)?.name : null;
  const departmentName = emp.departmentId ? departments?.find((d) => d.id === emp.departmentId)?.name : null;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          {backLink}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{fullName}</h1>
              {isDeactivated && <Badge variant="danger">{tEmployees('status.deactivated')}</Badge>}
            </div>
            {fullNameAr && <p className="text-sm text-muted-foreground" dir="rtl">{fullNameAr}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{emp.jobTitle || '—'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={emp.employmentStatus} t={tEmployees} />
              <Badge variant="outline">
                {emp.user
                  ? t('account.linkedTo', { name: `${emp.user.firstName} ${emp.user.lastName}` })
                  : tEmployees('noLinkedAccount')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t('sections.overview')}>
          <Field label={tEmployees('form.fields.phone')} value={emp.phone} dir="ltr" />
          <Field label={tEmployees('form.fields.email')} value={emp.email} dir="ltr" />
          <Field label={tEmployees('form.fields.nationalId')} value={emp.nationalId} dir="ltr" />
          <Field label={tEmployees('form.fields.dateOfBirth')} value={formatDateDisplay(emp.dateOfBirth)} dir="ltr" />
          <Field label={tEmployees('form.fields.gender')} value={emp.gender ? tEmployees(`form.genderOptions.${emp.gender}`) : null} />
          <Field label={tEmployees('form.fields.address')} value={emp.address} />
          <Field label={tEmployees('form.fields.notes')} value={emp.notes} />
        </SectionCard>

        <SectionCard title={t('sections.employment')}>
          <Field label={tEmployees('form.fields.jobTitle')} value={emp.jobTitle} />
          <Field label={tEmployees('form.fields.departmentFreeText')} value={emp.departmentFreeText} />
          <Field label={tEmployees('form.fields.departmentId')} value={departmentName} />
          <Field label={tEmployees('form.fields.branchId')} value={branchName} />
          <Field label={tEmployees('form.fields.employmentStatus')} value={tEmployees(`form.employmentStatusOptions.${emp.employmentStatus}`)} />
          <Field label={tEmployees('form.fields.hireDate')} value={formatDateDisplay(emp.hireDate)} dir="ltr" />
        </SectionCard>

        <SectionCard title={t('sections.financial')}>
          <Field
            label={tEmployees('form.fields.baseSalary')}
            value={emp.baseSalary ? formatAmount(parseFloat(emp.baseSalary), locale) : null}
            dir="ltr"
          />
          <Field label={tEmployees('form.fields.currency')} value={emp.currency} dir="ltr" />
        </SectionCard>

        <SectionCard title={t('sections.contract')}>
          <Field label={tEmployees('form.fields.contractStartAt')} value={formatDateDisplay(emp.contractStartAt)} dir="ltr" />
          <Field label={tEmployees('form.fields.contractEndAt')} value={formatDateDisplay(emp.contractEndAt)} dir="ltr" />
        </SectionCard>

        <SectionCard title={t('sections.account')}>
          {emp.user ? (
            <>
              <Field label={tEmployees('form.fields.firstName')} value={`${emp.user.firstName} ${emp.user.lastName}`} />
              <Field label={tEmployees('form.fields.phone')} value={emp.user.phone} dir="ltr" />
              <Field label={tEmployees('form.fields.email')} value={emp.user.email} dir="ltr" />
              <Field label={t('account.role')} value={emp.user.role} dir="ltr" />
              <Field label={t('account.status')} value={emp.user.isActive ? t('account.active') : t('account.inactive')} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{tEmployees('noLinkedAccount')}</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t('sections.documents')}>
        {docsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : docsError ? (
          <p className="text-sm text-destructive">{t('documents.loadFailed')}</p>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('documents.empty')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {downloadError && <p className="mb-2 text-xs text-destructive">{downloadError}</p>}
            <ul className="divide-y">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" dir="ltr">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`documents.categories.${doc.category}`)} · {formatDateTimeDisplay(doc.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(doc.id)}
                    disabled={downloadingId === doc.id}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingId === doc.id ? t('documents.downloading') : t('documents.download')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
