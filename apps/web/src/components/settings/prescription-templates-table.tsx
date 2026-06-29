'use client';

import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2, Pill, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  usePrescriptionTemplates,
  useCreatePrescriptionTemplate,
  useUpdatePrescriptionTemplate,
  useDeletePrescriptionTemplate,
} from '@/hooks/use-prescription-templates';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PrescriptionTemplate,
  PrescriptionTemplateItem,
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
} from '@/types/prescription-templates';

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

// ─── Template form ────────────────────────────────────────────────────────────

interface ItemRow {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
  refillsLeft: string;
}

const EMPTY_ROW: ItemRow = {
  medication: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
  quantity: '',
  refillsLeft: '',
};

function itemsToRows(items: PrescriptionTemplateItem[]): ItemRow[] {
  if (items.length === 0) return [{ ...EMPTY_ROW }];
  return items.map((item) => ({
    medication: item.medication,
    dosage: item.dosage ?? '',
    frequency: item.frequency ?? '',
    duration: item.duration ?? '',
    instructions: item.instructions ?? '',
    quantity: item.quantity != null ? String(item.quantity) : '',
    refillsLeft: item.refillsLeft != null ? String(item.refillsLeft) : '',
  }));
}

function rowsToItems(rows: ItemRow[]): PrescriptionTemplateItem[] {
  return rows.map((row) => ({
    medication: row.medication.trim(),
    dosage: row.dosage.trim() || undefined,
    frequency: row.frequency.trim() || undefined,
    duration: row.duration.trim() || undefined,
    instructions: row.instructions.trim() || undefined,
    quantity: row.quantity.trim() ? Number(row.quantity) : undefined,
    refillsLeft: row.refillsLeft.trim() ? Number(row.refillsLeft) : undefined,
  }));
}

interface FormState {
  name: string;
  nameAr: string;
  isActive: boolean;
  items: ItemRow[];
}

interface FormErrors {
  name?: string;
  items?: Record<number, string>;
  itemsGeneral?: string;
}

interface TemplateFormProps {
  mode: 'create' | 'edit';
  initial?: PrescriptionTemplate;
  onDone: () => void;
}

function TemplateForm({ mode, initial, onDone }: TemplateFormProps) {
  const t = useTranslations('settings.prescriptionTemplates');
  const tCommon = useTranslations('common');
  const create = useCreatePrescriptionTemplate();
  const update = useUpdatePrescriptionTemplate();

  const [values, setValues] = useState<FormState>({
    name: initial?.name ?? '',
    nameAr: initial?.nameAr ?? '',
    isActive: initial?.isActive ?? true,
    items: itemsToRows(initial?.items ?? []),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: 'name' | 'nameAr' | 'isActive', value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, name: undefined }));
    setSaveError(null);
  }

  function setRow(index: number, patch: Partial<ItemRow>) {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
    setErrors((prev) => {
      if (!prev.items) return prev;
      const items = { ...prev.items };
      delete items[index];
      return { ...prev, items, itemsGeneral: undefined };
    });
    setSaveError(null);
  }

  function addRow() {
    setValues((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ROW }] }));
  }

  function removeRow(index: number) {
    setValues((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.name.trim()) errs.name = t('form.validation.nameRequired');

    const itemErrs: Record<number, string> = {};
    values.items.forEach((row, i) => {
      if (!row.medication.trim()) itemErrs[i] = t('form.validation.medicationRequired');
    });
    if (Object.keys(itemErrs).length > 0) errs.items = itemErrs;
    if (values.items.length === 0) errs.itemsGeneral = t('form.validation.atLeastOneItem');

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaveError(null);
    try {
      const items = rowsToItems(values.items);
      if (mode === 'create') {
        const dto: CreatePrescriptionTemplateDto = {
          name: values.name.trim(),
          nameAr: values.nameAr.trim() || undefined,
          items,
        };
        await create.mutateAsync(dto);
      } else if (initial) {
        const dto: UpdatePrescriptionTemplateDto = {
          name: values.name.trim(),
          nameAr: values.nameAr.trim() || undefined,
          isActive: values.isActive,
          items,
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
            autoFocus
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

        {mode === 'edit' && (
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="rxt-isActive"
              checked={values.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <label htmlFor="rxt-isActive" className="cursor-pointer text-sm font-medium">
              {t('form.fields.isActive')}
            </label>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">{t('form.items.heading')}</p>

        {values.items.map((row, i) => (
          <div key={i} className="rounded-md border border-border bg-muted/10 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <FieldLabel required>{t('form.items.fields.medication')}</FieldLabel>
                <input
                  type="text"
                  value={row.medication}
                  onChange={(e) => setRow(i, { medication: e.target.value })}
                  className={inputClass(!!errors.items?.[i])}
                  placeholder={t('form.items.placeholders.medication')}
                  disabled={isPending}
                />
                <FieldError message={errors.items?.[i]} />
              </div>
              <div>
                <FieldLabel>{t('form.items.fields.dosage')}</FieldLabel>
                <input
                  type="text"
                  value={row.dosage}
                  onChange={(e) => setRow(i, { dosage: e.target.value })}
                  className={inputClass()}
                  placeholder={t('form.items.placeholders.dosage')}
                  disabled={isPending}
                />
              </div>
              <div>
                <FieldLabel>{t('form.items.fields.frequency')}</FieldLabel>
                <input
                  type="text"
                  value={row.frequency}
                  onChange={(e) => setRow(i, { frequency: e.target.value })}
                  className={inputClass()}
                  placeholder={t('form.items.placeholders.frequency')}
                  disabled={isPending}
                />
              </div>
              <div>
                <FieldLabel>{t('form.items.fields.duration')}</FieldLabel>
                <input
                  type="text"
                  value={row.duration}
                  onChange={(e) => setRow(i, { duration: e.target.value })}
                  className={inputClass()}
                  placeholder={t('form.items.placeholders.duration')}
                  disabled={isPending}
                />
              </div>
              <div className="lg:col-span-2">
                <FieldLabel>{t('form.items.fields.instructions')}</FieldLabel>
                <input
                  type="text"
                  value={row.instructions}
                  onChange={(e) => setRow(i, { instructions: e.target.value })}
                  className={inputClass()}
                  placeholder={t('form.items.placeholders.instructions')}
                  disabled={isPending}
                />
              </div>
              <div>
                <FieldLabel>{t('form.items.fields.quantity')}</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={row.quantity}
                  onChange={(e) => setRow(i, { quantity: e.target.value })}
                  className={inputClass()}
                  disabled={isPending}
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>{t('form.items.fields.refillsLeft')}</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={row.refillsLeft}
                  onChange={(e) => setRow(i, { refillsLeft: e.target.value })}
                  className={inputClass()}
                  disabled={isPending}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={isPending || values.items.length <= 1}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-destructive/30 px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="h-3 w-3" />
                {t('form.items.removeMedication')}
              </button>
            </div>
          </div>
        ))}

        {errors.itemsGeneral && <FieldError message={errors.itemsGeneral} />}

        <button
          type="button"
          onClick={addRow}
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('form.items.addMedication')}
        </button>
      </div>

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending
            ? mode === 'create'
              ? t('form.actions.creating')
              : t('form.actions.saving')
            : mode === 'create'
            ? t('form.actions.create')
            : t('form.actions.save')}
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

// ─── Templates Table ──────────────────────────────────────────────────────────

const COL_COUNT = 5;

export function PrescriptionTemplatesTable() {
  const t = useTranslations('settings.prescriptionTemplates');
  const tCommon = useTranslations('common');

  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = usePrescriptionTemplates({
    includeInactive: showInactive || undefined,
  });
  const deleteTemplate = useDeletePrescriptionTemplate();

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteTemplate.mutateAsync(id);
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
        onClick={() => {
          setExpandedId('new');
          setDeletingId(null);
        }}
        disabled={expandedId === 'new'}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('newTemplate')}
      </button>
    </div>
  );

  const thead = (
    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
      <tr>
        <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.items')}</th>
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
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
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

  const templates = data ?? [];

  if (templates.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <Pill className="h-8 w-8 text-muted-foreground/50" />
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
          <table className="w-full min-w-[600px]">
            {thead}
            <tbody>
              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <TemplateForm mode="create" onDone={() => setExpandedId(null)} />
                  </td>
                </tr>
              )}

              {templates.map((tpl) => (
                <Fragment key={tpl.id}>
                  <tr
                    className={`border-t border-border transition-colors hover:bg-muted/20 ${
                      !tpl.isActive ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{tpl.name}</p>
                      {tpl.nameAr && (
                        <p className="text-xs text-muted-foreground" dir="rtl">
                          {tpl.nameAr}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground" dir="ltr">
                      {tpl.items.length}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={tpl.isActive ? 'success' : 'outline'}>
                        {tpl.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === tpl.id ? null : tpl.id);
                            setDeletingId(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(deletingId === tpl.id ? null : tpl.id);
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

                  {expandedId === tpl.id && (
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={COL_COUNT} className="p-4">
                        <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                        <TemplateForm mode="edit" initial={tpl} onDone={() => setExpandedId(null)} />
                      </td>
                    </tr>
                  )}

                  {deletingId === tpl.id && (
                    <tr className="border-t border-border bg-destructive/5">
                      <td colSpan={COL_COUNT} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm text-destructive">{t('deleteConfirm')}</p>
                          {deleteError && deletingId === tpl.id && (
                            <p className="text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(tpl.id)}
                              disabled={deleteTemplate.isPending}
                              className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deleteTemplate.isPending ? t('deleting') : t('delete')}
                            </button>
                            <button
                              onClick={() => {
                                setDeletingId(null);
                                setDeleteError(null);
                              }}
                              disabled={deleteTemplate.isPending}
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
