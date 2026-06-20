'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Download, Upload, Trash2 } from 'lucide-react';
import { useEmployee } from '@/hooks/use-employees';
import { useBranches } from '@/hooks/use-branches';
import { useDepartments } from '@/hooks/use-departments';
import {
  useEmployeeDocuments,
  useEmployeeDocumentDownloadUrl,
  useRequestEmployeeDocumentUploadUrl,
  useRegisterEmployeeDocument,
  useDeleteEmployeeDocument,
} from '@/hooks/use-employee-documents';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount } from '@/lib/format-currency';
import { formatDateDisplay, formatDateTimeDisplay } from '@/lib/format-date';
import type { EmploymentStatus } from '@/types/employee';
import type { EmployeeDocumentCategory, EmployeeDocument } from '@/types/employee-document';

const EMPLOYEE_DOCUMENT_CATEGORIES: EmployeeDocumentCategory[] = [
  'PHOTO',
  'ID_DOCUMENT',
  'CONTRACT',
  'CERTIFICATE',
  'OTHER',
];
const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_DOCUMENT_SIZE_BYTES = 10_485_760;

const DOCUMENT_CHECKLIST: { category: EmployeeDocumentCategory; required: boolean }[] = [
  { category: 'PHOTO', required: true },
  { category: 'ID_DOCUMENT', required: true },
  { category: 'CONTRACT', required: true },
  { category: 'CERTIFICATE', required: false },
  { category: 'OTHER', required: false },
];

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

function DocumentUploadForm({
  employeeProfileId,
  defaultCategory,
  onDone,
}: {
  employeeProfileId: string;
  defaultCategory: EmployeeDocumentCategory;
  onDone: () => void;
}) {
  const t = useTranslations('hr.detail.documents');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<EmployeeDocumentCategory>(defaultCategory);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const requestUrl = useRequestEmployeeDocumentUploadUrl();
  const registerDoc = useRegisterEmployeeDocument();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (file) {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
        setError(t('uploadForm.invalidType'));
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        setError(t('uploadForm.tooLarge'));
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
    }
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || isUploading) return;
    setError(null);
    setIsUploading(true);

    try {
      // Step 1 — request a presigned upload URL from the API
      const { uploadUrl, storageKey } = await requestUrl.mutateAsync({
        employeeProfileId,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
        category,
      });

      // Step 2 — upload the binary directly to storage (no JWT; the presigned URL handles auth)
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });
      if (!putRes.ok) {
        throw new Error(t('uploadForm.uploadStorageFailed', { status: putRes.status }));
      }

      // Step 3 — register the metadata in the database
      try {
        await registerDoc.mutateAsync({
          employeeProfileId,
          dto: {
            category,
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
            storageKey,
          },
        });
      } catch {
        // Binary is in storage but the DB record failed — warn clearly so an admin can reconcile
        setError(t('uploadForm.uploadRegistrationFailed'));
        setIsUploading(false);
        return;
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadForm.uploadFailed'));
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{t('uploadForm.title')}</p>

      <div className="flex items-center gap-2.5">
        <label
          htmlFor="employee-document-input"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Upload className="h-3.5 w-3.5" />
          {t('uploadForm.filePicker')}
        </label>
        <input
          id="employee-document-input"
          type="file"
          accept={ALLOWED_DOCUMENT_MIME_TYPES.join(',')}
          className="sr-only"
          onChange={handleFileChange}
        />
        {selectedFile ? (
          <span className="max-w-[220px] truncate text-sm text-muted-foreground" dir="ltr">
            {selectedFile.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/60">{t('uploadForm.noFileChosen')}</span>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t('uploadForm.categoryLabel')}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EmployeeDocumentCategory)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {EMPLOYEE_DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(`categories.${cat}`)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isUploading ? t('uploadForm.uploadingButton') : t('uploadForm.uploadButton')}
        </button>
        {!isUploading && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t('uploadForm.cancelButton')}
          </button>
        )}
      </div>
    </form>
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
  const deleteDocMutation = useDeleteEmployeeDocument();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<EmployeeDocumentCategory | null>(null);

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

  async function handleDelete(documentId: string) {
    if (!window.confirm(t('documents.confirmDelete'))) return;
    setDeleteError(null);
    setDeletingId(documentId);
    try {
      await deleteDocMutation.mutateAsync({ employeeProfileId: employeeId, documentId });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('documents.deleteFailed'));
    } finally {
      setDeletingId(null);
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
        <div className="space-y-4">
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

  // Group documents by category, newest first, so the checklist can show the
  // latest upload per category while any extras surface in "other documents".
  const documentsByCategory = new Map<EmployeeDocumentCategory, EmployeeDocument[]>();
  for (const doc of documents ?? []) {
    const list = documentsByCategory.get(doc.category) ?? [];
    list.push(doc);
    documentsByCategory.set(doc.category, list);
  }
  for (const list of documentsByCategory.values()) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const checklistRows = DOCUMENT_CHECKLIST.map(({ category, required }) => {
    const docsInCategory = documentsByCategory.get(category) ?? [];
    return { category, required, latest: docsInCategory[0] ?? null, extras: docsInCategory.slice(1) };
  });
  const otherDocuments = checklistRows.flatMap((row) => row.extras);

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

      <div className="space-y-4">
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

        <SectionCard title={t('sections.contractFinancial')}>
          <Field label={tEmployees('form.fields.contractStartAt')} value={formatDateDisplay(emp.contractStartAt)} dir="ltr" />
          <Field label={tEmployees('form.fields.contractEndAt')} value={formatDateDisplay(emp.contractEndAt)} dir="ltr" />
          <Field
            label={tEmployees('form.fields.baseSalary')}
            value={emp.baseSalary ? formatAmount(parseFloat(emp.baseSalary), locale) : null}
            dir="ltr"
          />
          <Field label={tEmployees('form.fields.currency')} value={emp.currency} dir="ltr" />
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
        <div className="space-y-3">
          {docsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : docsError ? (
            <p className="text-sm text-destructive">{t('documents.loadFailed')}</p>
          ) : (
            <>
              {downloadError && <p className="text-xs text-destructive">{downloadError}</p>}
              {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

              <ul className="divide-y">
                {checklistRows.map((row) => (
                  <li key={row.category} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{t(`documents.categories.${row.category}`)}</span>
                          <Badge variant="outline">
                            {row.required ? t('documents.checklist.required') : t('documents.checklist.optional')}
                          </Badge>
                          {row.latest ? (
                            <Badge variant="success">{t('documents.checklist.uploaded')}</Badge>
                          ) : (
                            <Badge variant={row.required ? 'danger' : 'outline'}>{t('documents.checklist.missing')}</Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground" dir={row.latest ? 'ltr' : undefined}>
                          {row.latest
                            ? `${row.latest.fileName} · ${formatDateTimeDisplay(row.latest.createdAt)}`
                            : '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {row.latest && (
                          <button
                            onClick={() => handleDownload(row.latest!.id)}
                            disabled={downloadingId === row.latest.id}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadingId === row.latest.id ? t('documents.downloading') : t('documents.download')}
                          </button>
                        )}
                        {!isDeactivated && (
                          <button
                            onClick={() => setUploadingCategory(uploadingCategory === row.category ? null : row.category)}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {row.latest ? t('documents.checklist.replace') : t('documents.uploadButton')}
                          </button>
                        )}
                        {!isDeactivated && row.latest && (
                          <button
                            onClick={() => handleDelete(row.latest!.id)}
                            disabled={deletingId === row.latest.id}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-destructive/30 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === row.latest.id ? t('documents.deleting') : t('documents.deleteButton')}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isDeactivated && uploadingCategory === row.category && (
                      <div className="mt-3">
                        <DocumentUploadForm
                          employeeProfileId={employeeId}
                          defaultCategory={row.category}
                          onDone={() => setUploadingCategory(null)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {otherDocuments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('documents.checklist.otherDocuments')}</p>
                  <ul className="divide-y rounded-lg border">
                    {otherDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" dir="ltr">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t(`documents.categories.${doc.category}`)} · {formatDateTimeDisplay(doc.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadingId === doc.id}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadingId === doc.id ? t('documents.downloading') : t('documents.download')}
                          </button>
                          {!isDeactivated && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-destructive/30 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {deletingId === doc.id ? t('documents.deleting') : t('documents.deleteButton')}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
