'use client';

import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useDepartmentsList,
} from '@/hooks/use-clinic-settings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  Service,
  CreateServiceDto,
  UpdateServiceDto,
} from '@/types/clinic-settings';

const CODE_RE = /^[A-Z0-9_-]+$/;

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

// ─── Service form ─────────────────────────────────────────────────────────────

interface SvcFormState {
  name:         string;
  nameAr:       string;
  code:         string;
  departmentId: string;
  defaultPrice: string;
  isActive:     boolean;
}

interface SvcFormErrors {
  name?:         string;
  code?:         string;
  defaultPrice?: string;
}

interface ServiceFormProps {
  mode:     'create' | 'edit';
  initial?: Service;
  onDone:   () => void;
}

function ServiceForm({ mode, initial, onDone }: ServiceFormProps) {
  const t       = useTranslations('settings.services');
  const tCommon = useTranslations('common');
  const create  = useCreateService();
  const update  = useUpdateService();
  const { data: departments = [] } = useDepartmentsList();

  const [values, setValues] = useState<SvcFormState>({
    name:         initial?.name            ?? '',
    nameAr:       initial?.nameAr          ?? '',
    code:         initial?.code            ?? '',
    departmentId: initial?.departmentId    ?? '',
    defaultPrice: initial?.defaultPrice    ?? '0',
    isActive:     initial?.isActive        ?? true,
  });
  const [errors, setErrors]       = useState<SvcFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof SvcFormState, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): SvcFormErrors {
    const errs: SvcFormErrors = {};
    if (!values.name.trim()) errs.name = t('form.validation.nameRequired');
    const codeVal = values.code.trim().toUpperCase();
    if (!codeVal)               errs.code = t('form.validation.codeRequired');
    else if (!CODE_RE.test(codeVal)) errs.code = t('form.validation.codeFormat');
    const price = parseFloat(values.defaultPrice);
    if (isNaN(price) || price < 0) errs.defaultPrice = t('form.validation.priceMin');
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);
    try {
      const codeVal = values.code.trim().toUpperCase();
      if (mode === 'create') {
        const dto: CreateServiceDto = {
          name:         values.name.trim(),
          nameAr:       values.nameAr.trim() || undefined,
          code:         codeVal,
          departmentId: values.departmentId  || undefined,
          defaultPrice: parseFloat(values.defaultPrice),
        };
        await create.mutateAsync(dto);
      } else if (initial) {
        const dto: UpdateServiceDto = {
          name:         values.name.trim(),
          nameAr:       values.nameAr.trim() || undefined,
          code:         codeVal,
          departmentId: values.departmentId  || null,
          defaultPrice: parseFloat(values.defaultPrice),
          isActive:     values.isActive,
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
          <FieldLabel required>{t('form.fields.code')}</FieldLabel>
          <input
            type="text"
            value={values.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            className={inputClass(!!errors.code)}
            placeholder={t('form.placeholders.code')}
            disabled={isPending}
            dir="ltr"
          />
          <FieldError message={errors.code} />
        </div>

        <div>
          <FieldLabel>{t('form.fields.department')}</FieldLabel>
          <select
            value={values.departmentId}
            onChange={(e) => set('departmentId', e.target.value)}
            className={inputClass()}
            disabled={isPending}
          >
            <option value="">{t('form.noDepartment')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel required>{t('form.fields.defaultPrice')}</FieldLabel>
          <input
            type="number"
            min={0}
            step="0.01"
            value={values.defaultPrice}
            onChange={(e) => set('defaultPrice', e.target.value)}
            className={inputClass(!!errors.defaultPrice)}
            placeholder={t('form.placeholders.defaultPrice')}
            disabled={isPending}
            dir="ltr"
          />
          <FieldError message={errors.defaultPrice} />
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="svc-isActive"
              checked={values.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <label htmlFor="svc-isActive" className="cursor-pointer text-sm font-medium">
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

// ─── Services Table ───────────────────────────────────────────────────────────

const COL_COUNT = 6;

export function ServicesTable() {
  const t       = useTranslations('settings.services');
  const tCommon = useTranslations('common');

  const [showInactive, setShowInactive] = useState(false);
  const [deptFilter, setDeptFilter]     = useState('');
  const [expandedId, setExpandedId]     = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useServices({
    departmentId:    deptFilter    || undefined,
    includeInactive: showInactive || undefined,
  });
  const { data: departments = [] } = useDepartmentsList();
  const deleteSvc = useDeleteService();

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteSvc.mutateAsync(id);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deleteFailed'));
    }
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('filter.allDepartments')}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          {t('showInactive')}
        </label>
      </div>
      <button
        onClick={() => { setExpandedId('new'); setDeletingId(null); }}
        disabled={expandedId === 'new'}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('newService')}
      </button>
    </div>
  );

  const thead = (
    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
      <tr>
        <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.code')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.department')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.price')}</th>
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
            <table className="w-full min-w-[600px]">
              {thead}
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
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

  const items = data ?? [];

  if (items.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <Package className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">
            {deptFilter ? t('empty.withFilters') : t('empty.subtext')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            {thead}
            <tbody>

              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <ServiceForm mode="create" onDone={() => setExpandedId(null)} />
                  </td>
                </tr>
              )}

              {items.map((svc) => (
                <Fragment key={svc.id}>
                  <tr className={`border-t border-border transition-colors hover:bg-muted/20 ${!svc.isActive ? 'opacity-50' : ''}`}>

                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{svc.name}</p>
                      {svc.nameAr && (
                        <p className="text-xs text-muted-foreground" dir="rtl">{svc.nameAr}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" dir="ltr">
                        {svc.code}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {svc.department?.name ?? '—'}
                    </td>

                    <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                      {parseFloat(svc.defaultPrice) === 0 ? '—' : `${svc.defaultPrice} SYP`}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={svc.isActive ? 'success' : 'outline'}>
                        {svc.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === svc.id ? null : svc.id);
                            setDeletingId(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(deletingId === svc.id ? null : svc.id);
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

                  {expandedId === svc.id && (
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={COL_COUNT} className="p-4">
                        <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                        <ServiceForm
                          mode="edit"
                          initial={svc}
                          onDone={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {deletingId === svc.id && (
                    <tr className="border-t border-border bg-destructive/5">
                      <td colSpan={COL_COUNT} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm text-destructive">{t('deleteConfirm')}</p>
                          {deleteError && deletingId === svc.id && (
                            <p className="text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(svc.id)}
                              disabled={deleteSvc.isPending}
                              className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deleteSvc.isPending ? t('deleting') : t('delete')}
                            </button>
                            <button
                              onClick={() => { setDeletingId(null); setDeleteError(null); }}
                              disabled={deleteSvc.isPending}
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
