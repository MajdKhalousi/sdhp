'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, UserX } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { CreatePatientInput, UpdatePatientInput } from '@/hooks/use-patient';
import { usePatients, useCreatePatient, useDeletePatient } from '@/hooks/use-patient';
import { PatientForm } from '@/components/patients/patient-form';

function formatDate(iso: string | null, locale = 'en-US'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatGender(raw: string | null): string {
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export default function PatientsPage() {
  const t = useTranslations('patient');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 350 ms debounce — avoids firing on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = usePatients(debouncedSearch);
  const createPatient = useCreatePatient();
  const deletePatient = useDeletePatient();

  const patients = data?.data ?? [];

  async function handleCreate(formData: CreatePatientInput | UpdatePatientInput) {
    setCreateError(null);
    try {
      await createPatient.mutateAsync(formData as CreatePatientInput);
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة المريض');
    }
  }

  async function handleDelete(patientId: string) {
    const confirmed = window.confirm('هل أنت متأكد من أرشفة هذا المريض؟');
    if (!confirmed) return;
    setDeleteError(null);
    try {
      await deletePatient.mutateAsync(patientId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'حدث خطأ أثناء أرشفة المريض');
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t('list.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {data ? t('list.registeredCount', { count: data.total }) : ' '}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsCreateOpen(true); setCreateError(null); }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            إضافة مريض
          </button>

          <div className="relative w-64">
            <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('list.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border bg-background ps-8 pe-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* ── Create form ──────────────────────────────────── */}
      {isCreateOpen && (
        <div>
          {createError && (
            <p className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {createError}
            </p>
          )}
          <PatientForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => { setIsCreateOpen(false); setCreateError(null); }}
            isSubmitting={createPatient.isPending}
          />
        </div>
      )}

      {/* ── Delete error ─────────────────────────────────── */}
      {deleteError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{deleteError}</p>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* ── Fetch error ──────────────────────────────────── */}
      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : t('list.error.loadFailed')}
          </p>
          <button
            onClick={() => refetch()}
            className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      )}

      {/* ── Table / empty state ───────────────────────────── */}
      {data && (
        <>
          {patients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <UserX className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">{t('list.empty.heading')}</p>
              <p className="text-xs text-muted-foreground">
                {debouncedSearch ? t('list.empty.withSearch') : t('list.empty.noData')}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">{t('list.columns.patient')}</th>
                      <th className="px-4 py-3">{t('list.columns.mrn')}</th>
                      <th className="px-4 py-3">{t('list.columns.dob')}</th>
                      <th className="px-4 py-3">{t('list.columns.gender')}</th>
                      <th className="px-4 py-3">{t('list.columns.phone')}</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {patients.map((patient) => (
                      <tr
                        key={patient.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {patient.firstName} {patient.lastName}
                            {patient.firstNameAr && (
                              <span
                                className="ms-2 text-xs font-normal text-muted-foreground"
                                dir="rtl"
                              >
                                {patient.firstNameAr} {patient.lastNameAr}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">
                          {patient.mrn}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(patient.dateOfBirth, displayLocale)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatGender(patient.gender)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                          {patient.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={patient.isActive ? 'success' : 'outline'}>
                            {patient.isActive ? t('status.active') : t('status.inactive')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/patients/${patient.id}`}
                              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                            >
                              عرض
                            </Link>
                            <button
                              onClick={() => handleDelete(patient.id)}
                              disabled={deletePatient.isPending}
                              className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                            >
                              أرشفة
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {debouncedSearch && data.total > patients.length && (
            <p className="text-xs text-muted-foreground">
              {t('list.showingOf', { shown: patients.length, total: data.total })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
