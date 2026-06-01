'use client';

import { useState, Fragment } from 'react';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Pencil } from 'lucide-react';
import { useDoctorsList } from '@/hooks/use-appointments';
import { useDepartments } from '@/hooks/use-departments';
import { useUpdateDoctor } from '@/hooks/use-doctors';
import type { UpdateDoctorDto } from '@/hooks/use-doctors';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DoctorRef } from '@/types/appointment';
import type { Department } from '@/types/clinic-settings';

// ─── Field helpers ────────────────────────────────────────────────────────────

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

// ─── Doctor Edit Form ─────────────────────────────────────────────────────────

interface EditFormState {
  specialization: string;
  departmentId: string;
  consultationMinutes: string;
  isActive: boolean;
}

interface EditFormErrors {
  specialization?: string;
  consultationMinutes?: string;
}

interface DoctorEditFormProps {
  doctor: DoctorRef;
  departments: Department[];
  onDone: () => void;
}

function DoctorEditForm({ doctor, departments, onDone }: DoctorEditFormProps) {
  const t       = useTranslations('doctors.list');
  const tCommon = useTranslations('common');
  const update  = useUpdateDoctor();

  const [values, setValues] = useState<EditFormState>({
    specialization:     doctor.specialization     ?? '',
    departmentId:       doctor.departmentId        ?? '',
    consultationMinutes: String(doctor.consultationMinutes ?? ''),
    isActive:           doctor.isActive            ?? true,
  });
  const [errors, setErrors]       = useState<EditFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof EditFormState, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): EditFormErrors {
    const errs: EditFormErrors = {};
    const spec = values.specialization.trim();
    if (spec.length > 0 && spec.length < 2) {
      errs.specialization = t('validation.specializationMin');
    }
    const mins = values.consultationMinutes.trim();
    if (mins !== '') {
      const n = parseInt(mins, 10);
      if (isNaN(n) || n < 5) errs.consultationMinutes = t('validation.consultationMin');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);

    const dto: UpdateDoctorDto = {
      isActive: values.isActive,
      departmentId: values.departmentId || null,
    };

    const spec = values.specialization.trim();
    if (spec.length >= 2) dto.specialization = spec;

    const mins = values.consultationMinutes.trim();
    if (mins !== '') {
      const n = parseInt(mins, 10);
      if (n >= 5) dto.consultationMinutes = n;
    }

    try {
      await update.mutateAsync({ id: doctor.id, dto });
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.updateFailed'));
    }
  }

  // Department options: active depts + current dept if inactive
  const deptOptions = departments.filter(
    (d) => d.isActive || d.id === doctor.departmentId,
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div>
          <FieldLabel>{t('form.specialization')}</FieldLabel>
          <input
            type="text"
            value={values.specialization}
            onChange={(e) => set('specialization', e.target.value)}
            className={inputClass(!!errors.specialization)}
            disabled={update.isPending}
          />
          <FieldError message={errors.specialization} />
        </div>

        <div>
          <FieldLabel>{t('form.department')}</FieldLabel>
          <select
            value={values.departmentId}
            onChange={(e) => set('departmentId', e.target.value)}
            className={inputClass()}
            disabled={update.isPending}
          >
            <option value="">{t('form.noDepartment')}</option>
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>{t('form.consultationMinutes')}</FieldLabel>
          <input
            type="number"
            min={5}
            value={values.consultationMinutes}
            onChange={(e) => set('consultationMinutes', e.target.value)}
            className={inputClass(!!errors.consultationMinutes)}
            disabled={update.isPending}
          />
          <FieldError message={errors.consultationMinutes} />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id={`doc-isActive-${doctor.id}`}
            checked={values.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            disabled={update.isPending}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <label htmlFor={`doc-isActive-${doctor.id}`} className="cursor-pointer text-sm font-medium">
            {t('form.isActive')}
          </label>
        </div>

      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={update.isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {update.isPending ? t('actions.saving') : t('actions.save')}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={update.isPending}
          className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}

// ─── Doctors List ─────────────────────────────────────────────────────────────

const COL_COUNT = 5;

export function DoctorsList() {
  const t       = useTranslations('doctors.list');
  const tCommon = useTranslations('common');
  const locale  = useLocale();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useDoctorsList();
  const { data: allDepts = [] } = useDepartments();

  const doctors: DoctorRef[] = data?.data ?? [];

  // Build departmentId → department lookup map
  const deptMap = new Map<string, Department>(allDepts.map((d) => [d.id, d]));

  function getDeptName(doc: DoctorRef): string {
    if (!doc.departmentId) return '—';
    const dept = deptMap.get(doc.departmentId);
    if (!dept) return '—';
    return dept.name;
  }

  const thead = (
    <thead className="border-b bg-muted/40">
      <tr>
        <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.specialization')}</th>
        <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.department')}</th>
        <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.status')}</th>
        <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.actions')}</th>
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {thead}
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Array.from({ length: COL_COUNT }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-primary hover:underline"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="font-medium">{t('empty.heading')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('empty.subtext')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {thead}
          <tbody>
            {doctors.map((doc) => {
              const isDocActive = doc.isActive ?? doc.user.isActive;
              return (
                <Fragment key={doc.id}>
                  <tr className="border-b last:border-0 hover:bg-muted/30">

                    <td className="px-4 py-3 font-medium">
                      {doc.user.firstName} {doc.user.lastName}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.specialization ?? '—'}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {getDeptName(doc)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={isDocActive ? 'success' : 'outline'}>
                        {isDocActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/dashboard/doctors/${doc.id}/schedule`}
                          locale={locale}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t('manageSchedule')}
                        </Link>
                      </div>
                    </td>

                  </tr>

                  {expandedId === doc.id && (
                    <tr className="border-b bg-muted/10">
                      <td colSpan={COL_COUNT} className="p-4">
                        <p className="mb-3 text-sm font-semibold">{t('actions.edit')}</p>
                        <DoctorEditForm
                          doctor={doc}
                          departments={allDepts}
                          onDone={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}

                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
