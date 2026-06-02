'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  useClinicalReports,
  useCreateClinicalReport,
  useUpdateClinicalReport,
  useDeleteClinicalReport,
  useDownloadReportPdf,
  useSaveReportAsFile,
  type ClinicalReport,
} from '@/hooks/use-clinical-reports';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

// ── Types ─────────────────────────────────────────────────────────────────

interface EncounterData {
  chiefComplaint?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  followUpDate?: string | null;
}

interface Props {
  encounterId: string;
  patientId: string;
  encounterData?: EncounterData;
  readOnly?: boolean;
}

interface ReportForm {
  title: string;
  content: string;
}

const EMPTY_FORM: ReportForm = { title: '', content: '' };

const INPUT_CLASS =
  'w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring';

// ── Component ─────────────────────────────────────────────────────────────

export function ClinicalReportPanel({
  encounterId,
  patientId,
  encounterData,
  readOnly,
}: Props) {
  const t = useTranslations('encounter.clinicalReport');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [mutationError, setMutationError] = useState('');

  const user = useAuthStore((s) => s.user);
  const canSaveAsFile =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' || user?.role === 'DOCTOR';

  const { data: reports = [], isLoading, isError, error } = useClinicalReports({ encounterId });
  const { mutate: create, isPending: creating } = useCreateClinicalReport();
  const { mutate: update, isPending: updating } = useUpdateClinicalReport();
  const { mutate: deleteMutate, isPending: deleting } = useDeleteClinicalReport();
  const { download: downloadPdf, downloadingId } = useDownloadReportPdf();
  const { mutate: saveAsFile, isPending: savingFile } = useSaveReportAsFile();

  const [saveFileMsg, setSaveFileMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const saving = creating || updating;

  async function handleDownloadPdf(id: string) {
    try {
      await downloadPdf(id);
    } catch {
      setMutationError(t('error.downloadFailed'));
    }
  }

  function handleSaveAsFile(id: string) {
    setSaveFileMsg(null);
    saveAsFile(id, {
      onSuccess: () => setSaveFileMsg({ id, msg: t('saveAsFileSuccess'), ok: true }),
      onError: (e) => {
        const msg =
          e.name === 'ConflictError' ? t('saveAsFileDuplicate') : t('error.saveAsFileFailed');
        setSaveFileMsg({ id, msg, ok: false });
      },
    });
  }

  function buildPrefillContent(): string {
    if (!encounterData) return '';
    const lines: string[] = [];
    if (encounterData.chiefComplaint?.trim())
      lines.push(`${t('prefill.chiefComplaint')}:\n${encounterData.chiefComplaint.trim()}`);
    if (encounterData.notes?.trim())
      lines.push(`${t('prefill.examination')}:\n${encounterData.notes.trim()}`);
    if (encounterData.diagnosis?.trim())
      lines.push(`${t('prefill.diagnosis')}:\n${encounterData.diagnosis.trim()}`);
    if (encounterData.treatmentPlan?.trim())
      lines.push(`${t('prefill.treatmentPlan')}:\n${encounterData.treatmentPlan.trim()}`);
    if (encounterData.followUpDate?.trim())
      lines.push(`${t('prefill.followUp')}:\n${encounterData.followUpDate.slice(0, 10)}`);
    return lines.join('\n\n');
  }

  function openCreate() {
    setForm({ title: t('defaultTitle'), content: buildPrefillContent() });
    setEditingId(null);
    setFormError('');
    setMutationError('');
    setShowForm(true);
  }

  function openEdit(report: ClinicalReport) {
    setForm({ title: report.title, content: report.content });
    setEditingId(report.id);
    setFormError('');
    setMutationError('');
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function setField(key: keyof ReportForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  }

  function handleSaveDraft() {
    if (!form.title.trim()) {
      setFormError(t('validation.titleRequired'));
      return;
    }
    if (!form.content.trim()) {
      setFormError(t('validation.contentRequired'));
      return;
    }

    if (!editingId) {
      create(
        {
          patientId,
          encounterId,
          title: form.title.trim(),
          content: form.content.trim(),
          status: 'DRAFT',
        },
        {
          onSuccess: () => handleCancel(),
          onError: (e) =>
            setFormError(e instanceof Error ? e.message : t('error.saveFailed')),
        },
      );
    } else {
      update(
        { id: editingId, title: form.title.trim(), content: form.content.trim() },
        {
          onSuccess: () => handleCancel(),
          onError: (e) =>
            setFormError(e instanceof Error ? e.message : t('error.saveFailed')),
        },
      );
    }
  }

  function handleFinalize(id: string) {
    if (!window.confirm(t('confirmFinalize'))) return;
    setMutationError('');
    update(
      { id, status: 'FINALIZED' },
      {
        onError: (e) =>
          setMutationError(e instanceof Error ? e.message : t('error.finalizeFailed')),
      },
    );
  }

  function handleDelete(report: ClinicalReport) {
    if (!window.confirm(t('confirmDelete'))) return;
    setMutationError('');
    deleteMutate(
      { id: report.id, patientId },
      {
        onError: (e) =>
          setMutationError(e instanceof Error ? e.message : t('error.deleteFailed')),
      },
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : t('error.loadFailed')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {reports.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {/* ── Report cards ───────────────────────────────────────────────────── */}
      {reports.map((report) => {
        const isDraft = report.status === 'DRAFT';
        const isBeingEdited = editingId === report.id && showForm;
        const author = report.createdBy
          ? `${report.createdBy.firstName} ${report.createdBy.lastName}`
          : null;
        const updatedDate = formatDateDisplay(report.updatedAt);

        return (
          <div
            key={report.id}
            className={`rounded-lg border bg-background border-s-4 ${
              isBeingEdited
                ? 'border-dashed border-s-amber-300 opacity-50'
                : isDraft
                ? 'border-s-amber-400'
                : 'border-s-green-500'
            }`}
          >
            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        isDraft
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                      }`}
                    >
                      {isDraft ? t('statusDraft') : t('statusFinalized')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{report.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {author && `${t('createdBy')} ${author} · `}
                    {t('lastUpdated')} {updatedDate}
                  </p>
                </div>

                {/* Action buttons — DRAFT only, not while being edited.
                    Edit and Delete require active encounter; Finalize is always allowed. */}
                {isDraft && !isBeingEdited && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!readOnly && (
                      <button
                        onClick={() => openEdit(report)}
                        className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        {t('editButton')}
                      </button>
                    )}
                    <button
                      onClick={() => handleFinalize(report.id)}
                      disabled={updating}
                      className="inline-flex h-7 items-center rounded-md bg-green-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                    >
                      {t('finalizeButton')}
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => handleDelete(report)}
                        disabled={deleting}
                        className="inline-flex h-7 items-center rounded-md border border-destructive/30 bg-background px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {t('deleteButton')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Draft: truncated preview */}
              {isDraft && !isBeingEdited && (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground" dir="auto">
                  {report.content}
                </p>
              )}

              {/* Finalized: full read-only content */}
              {!isDraft && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="whitespace-pre-wrap text-sm text-foreground" dir="auto">
                    {report.content}
                  </p>

                  {/* PDF actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadPdf(report.id)}
                      disabled={downloadingId === report.id}
                      className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      {downloadingId === report.id ? t('downloading') : t('downloadPdf')}
                    </button>

                    {!readOnly && canSaveAsFile && (
                      <button
                        onClick={() => handleSaveAsFile(report.id)}
                        disabled={savingFile}
                        className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
                      >
                        {savingFile ? t('savingFile') : t('saveAsFile')}
                      </button>
                    )}
                  </div>

                  {/* Per-report save feedback */}
                  {saveFileMsg?.id === report.id && (
                    <p
                      className={`mt-1.5 text-xs ${
                        saveFileMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                      }`}
                    >
                      {saveFileMsg.msg}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Mutation error (finalize / delete) ─────────────────────────────── */}
      {mutationError && !showForm && (
        <p className="text-xs text-destructive">{mutationError}</p>
      )}

      {/* ── Create / Edit form ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-lg border border-dashed border-border p-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('titleLabel')} *
              </label>
              <input
                type="text"
                dir="auto"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder={t('titlePlaceholder')}
                className={`h-9 ${INPUT_CLASS}`}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('contentLabel')} *
              </label>
              <textarea
                rows={10}
                dir="auto"
                value={form.content}
                onChange={(e) => setField('content', e.target.value)}
                placeholder={t('contentPlaceholder')}
                className={`py-2 font-mono ${INPUT_CLASS}`}
              />
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? t('saving') : t('saveDraft')}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                {tCommon('actions.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create button ───────────────────────────────────────────────────── */}
      {!readOnly && !showForm && (
        <button
          onClick={openCreate}
          className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('createButton')}
        </button>
      )}
    </div>
  );
}
