'use client';

import { useState, Fragment } from 'react';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { useDoctorsList } from '@/hooks/use-appointments';
import { useDepartments } from '@/hooks/use-departments';
import { useStaff } from '@/hooks/use-staff';
import { useCreateDoctor, useUpdateDoctor } from '@/hooks/use-doctors';
import type { CreateDoctorDto, UpdateDoctorDto } from '@/hooks/use-doctors';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DoctorRef } from '@/types/appointment';
import type { Department } from '@/types/clinic-settings';
import type { StaffUser } from '@/types/staff';

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

// ─── Doctor Create Form ───────────────────────────────────────────────────────

interface CreateFormState {
  userId: string;
  specialization: string;
  departmentId: string;
  consultationMinutes: string;
  maxPatientsPerDay: string;
  licenseNumber: string;
  isActive: boolean;
}

interface CreateFormErrors {
  userId?: string;
  specialization?: string;
  consultationMinutes?: string;
  maxPatientsPerDay?: string;
}

interface DoctorCreateFormProps {
  availableUsers: StaffUser[];
  departments: Department[];
  onDone: () => void;
}

function DoctorCreateForm({ availableUsers, departments, onDone }: DoctorCreateFormProps) {
  const t       = useTranslations('doctors.list');
  const tCommon = useTranslations('common');
  const locale  = useLocale();
  const create  = useCreateDoctor();

  const [values, setValues] = useState<CreateFormState>({
    userId:              '',
    specialization:      '',
    departmentId:        '',
    consultationMinutes: '',
    maxPatientsPerDay:   '',
    licenseNumber:       '',
    isActive:            true,
  });
  const [errors, setErrors]       = useState<CreateFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof CreateFormState, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): CreateFormErrors {
    const errs: CreateFormErrors = {};
    if (!values.userId) errs.userId = t('validation.userRequired');
    const spec = values.specialization.trim();
    if (spec.length > 0 && spec.length < 2) errs.specialization = t('validation.specializationMin');
    const mins = values.consultationMinutes.trim();
    if (mins !== '') {
      const n = parseInt(mins, 10);
      if (isNaN(n) || n < 5) errs.consultationMinutes = t('validation.consultationMin');
    }
    const maxP = values.maxPatientsPerDay.trim();
    if (maxP !== '') {
      const n = parseInt(maxP, 10);
      if (isNaN(n) || n < 1) errs.maxPatientsPerDay = t('validation.maxPatientsMin');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);

    const dto: CreateDoctorDto = {
      userId:       values.userId,
      isActive:     values.isActive,
      departmentId: values.departmentId || null,
    };
    const spec = values.specialization.trim();
    if (spec.length >= 2) dto.specialization = spec;
    const mins = values.consultationMinutes.trim();
    if (mins !== '') {
      const n = parseInt(mins, 10);
      if (n >= 5) dto.consultationMinutes = n;
    }
    const maxP = values.maxPatientsPerDay.trim();
    if (maxP !== '') {
      const n = parseInt(maxP, 10);
      if (n >= 1) dto.maxPatientsPerDay = n;
    }
    const lic = values.licenseNumber.trim();
    if (lic) dto.licenseNumber = lic;

    try {
      await create.mutateAsync(dto);
      onDone();
    } catch (err) {
      if (err instanceof Error && err.name === 'ConflictError') {
        setSaveError(t('error.userConflict'));
      } else {
        setSaveError(err instanceof Error ? err.message : t('error.createFailed'));
      }
    }
  }

  if (availableUsers.length === 0) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <p className="text-sm text-muted-foreground">{t('form.noDoctorUsers')}</p>
        <Link
          href="/dashboard/settings/staff"
          locale={locale}
          className="text-sm text-primary hover:underline"
        >
          {t('hints.createStaffFirst')}
        </Link>
      </div>
    );
  }

  const activeDepts = departments.filter((d) => d.isActive);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <div>
          <FieldLabel>{t('form.userId')}</FieldLabel>
          <select
            value={values.userId}
            onChange={(e) => set('userId', e.target.value)}
            className={inputClass(!!errors.userId)}
            disabled={create.isPending}
          >
            <option value="">—</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}{u.phone ? ` — ${u.phone}` : ''}
              </option>
            ))}
          </select>
          <FieldError message={errors.userId} />
        </div>

        <div>
          <FieldLabel>{t('form.specialization')}</FieldLabel>
          <input
            type="text"
            value={values.specialization}
            onChange={(e) => set('specialization', e.target.value)}
            className={inputClass(!!errors.specialization)}
            disabled={create.isPending}
          />
          <FieldError message={errors.specialization} />
        </div>

        <div>
          <FieldLabel>{t('form.department')}</FieldLabel>
          <select
            value={values.departmentId}
            onChange={(e) => set('departmentId', e.target.value)}
            className={inputClass()}
            disabled={create.isPending}
          >
            <option value="">{t('form.noDepartment')}</option>
            {activeDepts.map((d) => (
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
            disabled={create.isPending}
            dir="ltr"
          />
          <FieldError message={errors.consultationMinutes} />
        </div>

        <div>
          <FieldLabel>{t('form.maxPatientsPerDay')}</FieldLabel>
          <input
            type="number"
            min={1}
            value={values.maxPatientsPerDay}
            onChange={(e) => set('maxPatientsPerDay', e.target.value)}
            className={inputClass(!!errors.maxPatientsPerDay)}
            disabled={create.isPending}
            dir="ltr"
          />
          <FieldError message={errors.maxPatientsPerDay} />
        </div>

        <div>
          <FieldLabel>{t('form.licenseNumber')}</FieldLabel>
          <input
            type="text"
            value={values.licenseNumber}
            onChange={(e) => set('licenseNumber', e.target.value)}
            className={inputClass()}
            disabled={create.isPending}
            dir="ltr"
          />
        </div>

      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="doc-create-isActive"
          checked={values.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          disabled={create.isPending}
          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
        />
        <label htmlFor="doc-create-isActive" className="cursor-pointer text-sm font-medium">
          {t('form.isActive')}
        </label>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {create.isPending ? t('actions.creating') : t('actions.create')}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={create.isPending}
          className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
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
    specialization:      doctor.specialization      ?? '',
    departmentId:        doctor.departmentId         ?? '',
    consultationMinutes: String(doctor.consultationMinutes ?? ''),
    isActive:            doctor.isActive             ?? true,
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
      isActive:     values.isActive,
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

  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);

  const { data, isLoading, isError, refetch } = useDoctorsList();
  const { data: allDepts = [] }               = useDepartments();
  const { data: allStaff = [] }               = useStaff();

  const doctors: DoctorRef[] = data?.data ?? [];

  // Compute available DOCTOR users: active, not yet linked to a doctor profile
  const linkedUserIds = new Set(
    doctors.map((d) => d.user?.id).filter((id): id is string => Boolean(id)),
  );
  const availableUsers = allStaff.filter(
    (u) => u.role === 'DOCTOR' && u.isActive && !linkedUserIds.has(u.id),
  );

  // Build departmentId → department lookup map
  const deptMap = new Map<string, Department>(allDepts.map((d) => [d.id, d]));

  function getDeptName(doc: DoctorRef): string {
    if (!doc.departmentId) return '—';
    const dept = deptMap.get(doc.departmentId);
    if (!dept) return '—';
    return dept.name;
  }

  const toolbar = (
    <div className="flex items-center justify-end">
      <button
        onClick={() => setExpandedId(expandedId === 'new' ? null : 'new')}
        disabled={expandedId === 'new'}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('newDoctor')}
      </button>
    </div>
  );

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
      <div className="space-y-3">
        {toolbar}
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
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm text-primary hover:underline"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Show empty state only when no doctors exist and create form is not open
  if (doctors.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="font-medium">{t('empty.heading')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('empty.subtext')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toolbar}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {thead}
            <tbody>

              {expandedId === 'new' && (
                <tr className="border-b bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <DoctorCreateForm
                      availableUsers={availableUsers}
                      departments={allDepts}
                      onDone={() => setExpandedId(null)}
                    />
                  </td>
                </tr>
              )}

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
    </div>
  );
}
