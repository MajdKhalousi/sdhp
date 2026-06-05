'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Search, UserX } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { CreatePatientInput, UpdatePatientInput, DuplicateCandidate } from '@/hooks/use-patient';
import { usePatients, useCreatePatient, useDeletePatient, useCheckDuplicatePatient } from '@/hooks/use-patient';
import { PatientForm } from '@/components/patients/patient-form';
import { DuplicateWarning } from '@/components/patients/duplicate-warning';
import { DiscardConfirm } from '@/components/patients/discard-confirm';
import { useAuthStore } from '@/store/auth';
import { useUnsavedGuardStore } from '@/store/unsaved-guard';
import { formatDateDisplay } from '@/lib/format-date';

const PAGE_LIMIT = 25;

const PATIENT_EDIT_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
const PATIENT_ARCHIVE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);
const PATIENT_BOOK_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
const PATIENT_INVOICE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);

function computeAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function formatShortDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

export default function PatientsPage() {
  const t = useTranslations('patient');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const { user } = useAuthStore();
  const canEdit    = user ? PATIENT_EDIT_ROLES.has(user.role)    : false;
  const canArchive = user ? PATIENT_ARCHIVE_ROLES.has(user.role) : false;
  const canBook    = user ? PATIENT_BOOK_ROLES.has(user.role)    : false;
  const canInvoice = user ? PATIENT_INVOICE_ROLES.has(user.role) : false;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<CreatePatientInput | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateCandidate[]>([]);
  const [isCreateFormDirty, setIsCreateFormDirty] = useState(false);

  // 350 ms debounce — avoids firing on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.replace(/\s+/g, ' ').trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Warn browser before unload when the create form has unsaved data
  useEffect(() => {
    if (!isCreateOpen || !isCreateFormDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isCreateOpen, isCreateFormDirty]);

  const { data, isLoading, isError, error, refetch } = usePatients({ search: debouncedSearch, page, limit: PAGE_LIMIT });
  const createPatient = useCreatePatient();
  const deletePatient = useDeletePatient();
  const checkDuplicate = useCheckDuplicatePatient();
  const guard = useUnsavedGuardStore();
  const router = useRouter();

  const patients = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1;

  // Sync guard enabled state with form open+dirty status
  useEffect(() => {
    guard.setEnabled(isCreateOpen && isCreateFormDirty);
  }, [isCreateOpen, isCreateFormDirty]);

  // Reset guard when patients page unmounts (navigated away while form was open)
  useEffect(() => {
    return () => {
      const s = useUnsavedGuardStore.getState();
      s.setEnabled(false);
      s.stayHere();
    };
  }, []);

  function closeCreateForm() {
    setIsCreateOpen(false);
    setCreateError(null);
    setDuplicateMatches([]);
    setPendingPayload(null);
    setIsCreateFormDirty(false);
  }

  function requestCloseCreateForm() {
    guard.requestNavigate(closeCreateForm);
  }

  async function doCreate(payload: CreatePatientInput) {
    try {
      await createPatient.mutateAsync(payload);
      closeCreateForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('list.errors.createFailed'));
    }
  }

  async function handleCreate(formData: CreatePatientInput | UpdatePatientInput) {
    setCreateError(null);
    const payload = formData as CreatePatientInput;
    try {
      const result = await checkDuplicate.mutateAsync({
        firstName:   payload.firstName,
        lastName:    payload.lastName,
        phone:       payload.phone,
        nationalId:  payload.nationalId ?? undefined,
        dateOfBirth: payload.dateOfBirth,
      });
      if (result.matches.length > 0) {
        setPendingPayload(payload);
        setDuplicateMatches(result.matches);
        return;
      }
      await doCreate(payload);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('list.errors.createFailed'));
    }
  }

  async function handleCreateAnyway() {
    if (!pendingPayload) return;
    setCreateError(null);
    await doCreate(pendingPayload);
  }

  function handleCancelDuplicateWarning() {
    setPendingPayload(null);
    setDuplicateMatches([]);
  }

  async function handleDelete(patientId: string) {
    setDeleteError(null);
    try {
      await deletePatient.mutateAsync(patientId);
      setArchiveConfirmId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('list.errors.archiveFailed'));
      setArchiveConfirmId(null);
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
          {canEdit && (
            <button
              onClick={() => { setIsCreateOpen(true); setCreateError(null); }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('list.addPatient')}
            </button>
          )}

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
        <div className="space-y-4">
          {createError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {createError}
            </p>
          )}
          {guard.showConfirm && (
            <DiscardConfirm
              onStay={guard.stayHere}
              onDiscard={guard.confirmLeave}
            />
          )}
          {!guard.showConfirm && duplicateMatches.length > 0 && (
            <DuplicateWarning
              matches={duplicateMatches}
              onCreateAnyway={handleCreateAnyway}
              onCancel={handleCancelDuplicateWarning}
              isCreating={createPatient.isPending}
            />
          )}
          <PatientForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={requestCloseCreateForm}
            onDirtyChange={setIsCreateFormDirty}
            isSubmitting={createPatient.isPending || checkDuplicate.isPending}
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
                      <th className="px-4 py-3">{t('list.columns.status')}</th>
                      <th className="px-4 py-3">{t('list.columns.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {patients.map((patient) => {
                      const age          = computeAge(patient.dateOfBirth);
                      const chronicText  = patient.chronicDiseases?.trim() || null;
                      const lastVisitText = formatShortDate(patient.lastVisitAt, displayLocale);
                      const nextApptText  = formatShortDate(patient.nextAppointmentAt, displayLocale);
                      return (
                      <tr
                        key={patient.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/dashboard/patients/${patient.id}`}
                              onClick={(e) => {
                                if (guard.enabled) {
                                  e.preventDefault();
                                  guard.requestNavigate(() => router.push(`/dashboard/patients/${patient.id}`));
                                }
                              }}
                              className="font-medium text-foreground transition-colors hover:text-primary"
                            >
                              {locale === 'ar' && patient.firstNameAr
                                ? `${patient.firstNameAr}${patient.lastNameAr ? ` ${patient.lastNameAr}` : ''}`
                                : `${patient.firstName} ${patient.lastName}`}
                            </Link>
                            {chronicText && (
                              <span
                                className="block max-w-[220px] truncate rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                                title={chronicText}
                                dir="auto"
                              >
                                {chronicText}
                              </span>
                            )}
                            {(lastVisitText || nextApptText) && (
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                {lastVisitText && (
                                  <span>{t('list.lastSeen')}: {lastVisitText}</span>
                                )}
                                {nextApptText && (
                                  <span>{t('list.nextAppt')}: {nextApptText}</span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">
                          {patient.mrn}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateDisplay(patient.dateOfBirth)}
                          {age !== null && (
                            <span className="ms-1.5 text-xs opacity-60">
                              {age} {t('list.ageYears')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {patient.gender
                            ? t(`gender.${patient.gender.toLowerCase()}` as Parameters<typeof t>[0])
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                          {patient.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={patient.isActive ? 'success' : 'outline'}>
                              {patient.isActive ? t('status.active') : t('status.inactive')}
                            </Badge>
                            {canInvoice && patient.hasOutstanding && (
                              <Badge variant="warning">
                                {t('list.balance')}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {canBook && (
                              <Link
                                href={`/dashboard/appointments/new?patientId=${patient.id}`}
                                onClick={(e) => {
                                  if (guard.enabled) {
                                    e.preventDefault();
                                    guard.requestNavigate(() => router.push(`/dashboard/appointments/new?patientId=${patient.id}`));
                                  }
                                }}
                                className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                              >
                                {t('list.book')}
                              </Link>
                            )}
                            {canInvoice && (
                              <Link
                                href={`/dashboard/invoices/new?patientId=${patient.id}`}
                                onClick={(e) => {
                                  if (guard.enabled) {
                                    e.preventDefault();
                                    guard.requestNavigate(() => router.push(`/dashboard/invoices/new?patientId=${patient.id}`));
                                  }
                                }}
                                className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                              >
                                {t('list.invoice')}
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/patients/${patient.id}`}
                              onClick={(e) => {
                                if (guard.enabled) {
                                  e.preventDefault();
                                  guard.requestNavigate(() => router.push(`/dashboard/patients/${patient.id}`));
                                }
                              }}
                              className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                            >
                              {t('list.view')}
                            </Link>
                            {canArchive && (
                              archiveConfirmId === patient.id ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="text-xs text-destructive">{t('list.confirmArchive')}</span>
                                  <button
                                    onClick={() => handleDelete(patient.id)}
                                    disabled={deletePatient.isPending}
                                    className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                                  >
                                    {t('list.archive')}
                                  </button>
                                  <button
                                    onClick={() => setArchiveConfirmId(null)}
                                    disabled={deletePatient.isPending}
                                    className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                                  >
                                    {tCommon('actions.cancel')}
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setArchiveConfirmId(patient.id)}
                                  disabled={deletePatient.isPending}
                                  className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                                >
                                  {t('list.archive')}
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 pt-1 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tCommon('pagination.previous')}
              </button>
              <span className="text-xs text-muted-foreground">
                {tCommon('pagination.pageOf', { page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tCommon('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
