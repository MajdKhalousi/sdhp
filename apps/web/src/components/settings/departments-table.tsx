'use client';

import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/use-departments';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/types/clinic-settings';

// ─── Field helpers ────────────────────────────────────────────────────────────

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

// ─── Department Form ──────────────────────────────────────────────────────────

interface DeptFormState {
  name: string;
  nameAr: string;
  code: string;
  isActive: boolean;
}

interface DeptFormErrors {
  name?: string;
}

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  initial?: Department;
  onDone: () => void;
}

function DepartmentForm({ mode, initial, onDone }: DepartmentFormProps) {
  const t = useTranslations('settings.departments');
  const tCommon = useTranslations('common');
  const create = useCreateDepartment();
  const update = useUpdateDepartment();

  const [values, setValues] = useState<DeptFormState>({
    name:     initial?.name     ?? '',
    nameAr:   initial?.nameAr   ?? '',
    code:     initial?.code     ?? '',
    isActive: initial?.isActive ?? true,
  });
  const [errors, setErrors]       = useState<DeptFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof DeptFormState, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): DeptFormErrors {
    const errs: DeptFormErrors = {};
    if (!values.name.trim()) errs.name = t('form.validation.nameRequired');
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);
    try {
      if (mode === 'create') {
        const dto: CreateDepartmentDto = {
          name:     values.name.trim(),
          nameAr:   values.nameAr.trim() || undefined,
          code:     values.code.trim()   || undefined,
          isActive: true,
        };
        await create.mutateAsync(dto);
      } else if (initial) {
        const dto: UpdateDepartmentDto = {
          name:     values.name.trim(),
          nameAr:   values.nameAr.trim() || undefined,
          isActive: values.isActive,
          ...(values.code.trim() ? { code: values.code.trim() } : {}),
        };
        await update.mutateAsync({ id: initial.id, dto });
      }
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <div>
          <FieldLabel required>{t('form.fields.name')}</FieldLabel>
          <input
            type="text"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass(!!errors.name)}
            placeholder={t('form.placeholders.name')}
            disabled={isPending}
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <FieldLabel>{t('form.fields.nameAr')}</FieldLabel>
          <input
            type="text"
            value={values.nameAr}
            onChange={(e) => set('nameAr', e.target.value)}
            className={inputClass()}
            placeholder={t('form.placeholders.nameAr')}
            disabled={isPending}
            dir="rtl"
          />
        </div>

        <div>
          <FieldLabel>{t('form.fields.code')}</FieldLabel>
          <input
            type="text"
            value={values.code}
            onChange={(e) => set('code', e.target.value)}
            className={inputClass()}
            placeholder={t('form.placeholders.code')}
            disabled={isPending}
            dir="ltr"
          />
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="dept-isActive"
              checked={values.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <label htmlFor="dept-isActive" className="cursor-pointer text-sm font-medium">
              {t('form.fields.isActive')}
            </label>
          </div>
        )}

      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending
            ? (mode === 'create' ? t('form.actions.creating') : t('form.actions.saving'))
            : (mode === 'create' ? t('form.actions.create')   : t('form.actions.save'))}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}

// ─── Departments Table ────────────────────────────────────────────────────────

const COL_COUNT = 4;

export function DepartmentsTable() {
  const t       = useTranslations('settings.departments');
  const tCommon = useTranslations('common');

  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId]     = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data: allDepts, isLoading, isError, error, refetch } = useDepartments();
  const deleteDept = useDeleteDepartment();

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteDept.mutateAsync(id);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deleteFailed'));
    }
  }

  const items = (allDepts ?? []).filter((d) => showInactive || d.isActive);

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        {t('showInactive')}
      </label>
      <button
        onClick={() => { setExpandedId('new'); setDeletingId(null); }}
        disabled={expandedId === 'new'}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('newDepartment')}
      </button>
    </div>
  );

  const thead = (
    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
      <tr>
        <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.code')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.status')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.actions')}</th>
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              {thead}
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : tCommon('states.error')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtext')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            {thead}
            <tbody>

              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <DepartmentForm mode="create" onDone={() => setExpandedId(null)} />
                  </td>
                </tr>
              )}

              {items.map((dept) => (
                <Fragment key={dept.id}>
                  <tr className={`border-t border-border transition-colors hover:bg-muted/20 ${!dept.isActive ? 'opacity-50' : ''}`}>

                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{dept.name}</p>
                      {dept.nameAr && (
                        <p className="text-xs text-muted-foreground" dir="rtl">{dept.nameAr}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {dept.code ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {dept.code}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={dept.isActive ? 'success' : 'outline'}>
                        {dept.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === dept.id ? null : dept.id);
                            setDeletingId(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(deletingId === dept.id ? null : dept.id);
                            setExpandedId(null);
                            setDeleteError(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>

                  {expandedId === dept.id && (
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={COL_COUNT} className="p-4">
                        <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                        <DepartmentForm
                          mode="edit"
                          initial={dept}
                          onDone={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {deletingId === dept.id && (
                    <tr className="border-t border-border bg-destructive/5">
                      <td colSpan={COL_COUNT} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm text-destructive">{t('deleteConfirm')}</p>
                          {deleteError && deletingId === dept.id && (
                            <p className="text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(dept.id)}
                              disabled={deleteDept.isPending}
                              className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deleteDept.isPending ? t('deleting') : t('delete')}
                            </button>
                            <button
                              onClick={() => { setDeletingId(null); setDeleteError(null); }}
                              disabled={deleteDept.isPending}
                              className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                            >
                              {tCommon('actions.cancel')}
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
      </div>
    </div>
  );
}
