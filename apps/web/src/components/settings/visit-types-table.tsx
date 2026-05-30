'use client';

import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useVisitTypes,
  useCreateVisitType,
  useUpdateVisitType,
  useDeleteVisitType,
} from '@/hooks/use-clinic-settings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  VisitType,
  VisitTypeCode,
  CreateVisitTypeDto,
  UpdateVisitTypeDto,
} from '@/types/clinic-settings';

// ─── Color swatch picker ──────────────────────────────────────────────────────

const SWATCHES = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
  '#6B7280', '#14B8A6',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={`h-6 w-6 rounded-full border-2 transition-transform ${
            value === c
              ? 'border-foreground scale-110'
              : 'border-transparent hover:scale-105'
          }`}
          aria-label={c}
        />
      ))}
      <input
        type="color"
        value={value || '#6B7280'}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
        title="Custom color"
      />
    </div>
  );
}

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

// ─── Visit Type form ──────────────────────────────────────────────────────────

const CODES: VisitTypeCode[] = [
  'CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'PROCEDURE', 'FREE_VISIT',
];

interface VTFormState {
  name: string;
  nameAr: string;
  code: VisitTypeCode | '';
  color: string;
  durationMinutes: string;
  basePrice: string;
  isActive: boolean;
}

interface VTFormErrors {
  name?: string;
  code?: string;
  durationMinutes?: string;
  basePrice?: string;
}

interface VisitTypeFormProps {
  mode: 'create' | 'edit';
  initial?: VisitType;
  onDone: () => void;
}

function VisitTypeForm({ mode, initial, onDone }: VisitTypeFormProps) {
  const t = useTranslations('settings.visitTypes');
  const tCommon = useTranslations('common');
  const create = useCreateVisitType();
  const update = useUpdateVisitType();

  const [values, setValues] = useState<VTFormState>({
    name:            initial?.name             ?? '',
    nameAr:          initial?.nameAr           ?? '',
    code:            initial?.code             ?? '',
    color:           initial?.color            ?? SWATCHES[0],
    durationMinutes: String(initial?.durationMinutes ?? 20),
    basePrice:       initial?.basePrice        ?? '',
    isActive:        initial?.isActive         ?? true,
  });
  const [errors, setErrors]       = useState<VTFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof VTFormState, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): VTFormErrors {
    const errs: VTFormErrors = {};
    if (!values.name.trim()) errs.name = t('form.validation.nameRequired');
    if (!values.code)        errs.code = t('form.validation.codeRequired');
    const dur = parseInt(values.durationMinutes, 10);
    if (isNaN(dur) || dur < 5) errs.durationMinutes = t('form.validation.durationMin');
    if (values.basePrice) {
      const p = parseFloat(values.basePrice);
      if (isNaN(p) || p < 0) errs.basePrice = t('form.validation.basePriceMin');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);
    try {
      if (mode === 'create') {
        const dto: CreateVisitTypeDto = {
          name:            values.name.trim(),
          nameAr:          values.nameAr.trim() || undefined,
          code:            values.code as VisitTypeCode,
          color:           values.color || undefined,
          durationMinutes: parseInt(values.durationMinutes, 10),
          basePrice:       values.basePrice ? parseFloat(values.basePrice) : undefined,
        };
        await create.mutateAsync(dto);
      } else if (initial) {
        const dto: UpdateVisitTypeDto = {
          name:            values.name.trim(),
          nameAr:          values.nameAr.trim() || undefined,
          code:            values.code as VisitTypeCode,
          color:           values.color || undefined,
          durationMinutes: parseInt(values.durationMinutes, 10),
          basePrice:       values.basePrice ? parseFloat(values.basePrice) : null,
          isActive:        values.isActive,
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
          <select
            value={values.code}
            onChange={(e) => set('code', e.target.value)}
            className={inputClass(!!errors.code)}
            disabled={isPending}
          >
            <option value="">{t('form.codePrompt')}</option>
            {CODES.map((c) => (
              <option key={c} value={c}>
                {t(`code.${c}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <FieldError message={errors.code} />
        </div>

        <div>
          <FieldLabel required>{t('form.fields.durationMinutes')}</FieldLabel>
          <input
            type="number"
            min={5}
            value={values.durationMinutes}
            onChange={(e) => set('durationMinutes', e.target.value)}
            className={inputClass(!!errors.durationMinutes)}
            disabled={isPending}
            dir="ltr"
          />
          <FieldError message={errors.durationMinutes} />
        </div>

        <div>
          <FieldLabel>{t('form.fields.basePrice')}</FieldLabel>
          <input
            type="number"
            min={0}
            step="0.01"
            value={values.basePrice}
            onChange={(e) => set('basePrice', e.target.value)}
            className={inputClass(!!errors.basePrice)}
            placeholder={t('form.placeholders.basePrice')}
            disabled={isPending}
            dir="ltr"
          />
          <FieldError message={errors.basePrice} />
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="vt-isActive"
              checked={values.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <label htmlFor="vt-isActive" className="cursor-pointer text-sm font-medium">
              {t('form.fields.isActive')}
            </label>
          </div>
        )}

      </div>

      <div>
        <FieldLabel>{t('form.fields.color')}</FieldLabel>
        <ColorPicker value={values.color} onChange={(c) => set('color', c)} />
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

// ─── Visit Types Table ────────────────────────────────────────────────────────

const COL_COUNT = 7;

export function VisitTypesTable() {
  const t       = useTranslations('settings.visitTypes');
  const tCommon = useTranslations('common');

  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId]     = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useVisitTypes({ includeInactive: showInactive });
  const deleteVT = useDeleteVisitType();

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteVT.mutateAsync(id);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deleteFailed'));
    }
  }

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
        {t('newVisitType')}
      </button>
    </div>
  );

  const thead = (
    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
      <tr>
        <th className="w-10 px-4 py-3" />
        <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.code')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.duration')}</th>
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
            <table className="w-full min-w-[680px]">
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
          <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
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
          <table className="w-full min-w-[680px]">
            {thead}
            <tbody>

              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <VisitTypeForm mode="create" onDone={() => setExpandedId(null)} />
                  </td>
                </tr>
              )}

              {items.map((vt) => (
                <Fragment key={vt.id}>
                  <tr className={`border-t border-border transition-colors hover:bg-muted/20 ${!vt.isActive ? 'opacity-50' : ''}`}>

                    <td className="px-4 py-3">
                      <span
                        className="block h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: vt.color ?? '#6B7280' }}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{vt.name}</p>
                      {vt.nameAr && (
                        <p className="text-xs text-muted-foreground" dir="rtl">{vt.nameAr}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {t(`code.${vt.code}` as Parameters<typeof t>[0])}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                      {vt.durationMinutes} min
                    </td>

                    <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                      {vt.basePrice ? `${vt.basePrice} SYP` : '—'}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={vt.isActive ? 'success' : 'outline'}>
                        {vt.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === vt.id ? null : vt.id);
                            setDeletingId(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(deletingId === vt.id ? null : vt.id);
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

                  {expandedId === vt.id && (
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={COL_COUNT} className="p-4">
                        <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                        <VisitTypeForm
                          mode="edit"
                          initial={vt}
                          onDone={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {deletingId === vt.id && (
                    <tr className="border-t border-border bg-destructive/5">
                      <td colSpan={COL_COUNT} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm text-destructive">{t('deleteConfirm')}</p>
                          {deleteError && deletingId === vt.id && (
                            <p className="text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(vt.id)}
                              disabled={deleteVT.isPending}
                              className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deleteVT.isPending ? t('deleting') : t('delete')}
                            </button>
                            <button
                              onClick={() => { setDeletingId(null); setDeleteError(null); }}
                              disabled={deleteVT.isPending}
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
