'use client';

import { useState } from 'react';
import { Download, FolderOpen, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePatientMedicalFiles,
  useRequestUploadUrl,
  useRegisterMedicalFile,
  getMedicalFileDownloadUrl,
  type MedicalFile,
} from '@/hooks/use-medical-files';
import type { MedicalFileCategory } from '@/types/timeline';

const FILE_CATEGORIES: MedicalFileCategory[] = [
  'LAB_RESULT',
  'RADIOLOGY_IMAGE',
  'PRESCRIPTION',
  'REFERRAL',
  'DISCHARGE_SUMMARY',
  'CONSENT_FORM',
  'INSURANCE',
  'CLINICAL_NOTE',
  'ID_DOCUMENT',
  'OTHER',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── FileListItem ──────────────────────────────────────────────────────────────

function FileListItem({ file }: { file: MedicalFile }) {
  const t = useTranslations('timeline');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadError(null);
    try {
      const { downloadUrl } = await getMedicalFileDownloadUrl(file.id);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setDownloadError('فشل الحصول على رابط التحميل');
    }
  }

  const uploader = `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`;
  const date = new Date(file.createdAt).toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-slate-400">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="mb-1.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {t(`fileCategories.${file.category}` as Parameters<typeof t>[0])}
          </span>
          <p className="font-medium text-sm text-foreground truncate" dir="auto">
            {file.fileName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
            {file.mimeType} · {formatBytes(file.sizeBytes)}
          </p>
          {file.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{file.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('cards.uploadedBy', { uploader })} · {date}
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-3 w-3" />
          تحميل
        </button>
      </div>

      {downloadError && (
        <p className="mt-1.5 text-xs text-destructive">{downloadError}</p>
      )}
    </div>
  );
}

// ── UploadForm ────────────────────────────────────────────────────────────────

interface UploadFormProps {
  patientId: string;
  onDone(): void;
}

function UploadForm({ patientId, onDone }: UploadFormProps) {
  const t = useTranslations('timeline');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<MedicalFileCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const requestUrl = useRequestUploadUrl();
  const registerFile = useRegisterMedicalFile();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || isUploading) return;
    setError(null);
    setIsUploading(true);

    try {
      // Step 1 — request presigned upload URL from backend
      const { uploadUrl, storageKey } = await requestUrl.mutateAsync({
        patientId,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        category,
        description: description.trim() || undefined,
      });

      // Step 2 — upload binary directly to storage (no JWT, presigned URL handles auth)
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
      });
      if (!putRes.ok) {
        throw new Error(`فشل رفع الملف إلى التخزين (${putRes.status})`);
      }

      // Step 3 — register metadata in the database
      try {
        await registerFile.mutateAsync({
          patientId,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: selectedFile.size,
          storageKey,
          category,
          description: description.trim() || undefined,
        });
      } catch {
        // Binary is in storage but DB record failed — warn clearly so admin can reconcile
        setError('تم رفع الملف ولكن فشل تسجيله، يرجى المحاولة أو التواصل مع الإدارة');
        setIsUploading(false);
        return;
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الملف');
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">رفع ملف جديد</p>

      {/* File picker */}
      <div className="flex items-center gap-2.5">
        <label
          htmlFor="medical-file-input"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Upload className="h-3.5 w-3.5" />
          اختر ملفاً
        </label>
        <input
          id="medical-file-input"
          type="file"
          className="sr-only"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        {selectedFile ? (
          <span className="max-w-[220px] truncate text-sm text-muted-foreground">
            {selectedFile.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/60">لم يُختر ملف</span>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          التصنيف
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MedicalFileCategory)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {FILE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(`fileCategories.${cat}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          الوصف (اختياري)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثال: نتائج تحليل الدم من 2026"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
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
          {isUploading ? 'جاري الرفع…' : 'رفع'}
        </button>
        {!isUploading && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            إلغاء
          </button>
        )}
      </div>
    </form>
  );
}

// ── FilesTab ──────────────────────────────────────────────────────────────────

interface FilesTabProps {
  patientId: string;
}

export function FilesTab({ patientId }: FilesTabProps) {
  const tError = useTranslations('patient.detail.error');
  const tTab = useTranslations('patient.detail.clinicalTab');
  const tCommon = useTranslations('common');
  const [showUpload, setShowUpload] = useState(false);

  const { data: files = [], isLoading, isError, error, refetch } = usePatientMedicalFiles(patientId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{tError('loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : tError('occurred')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {files.length > 0 && `${files.length} ملف`}
        </p>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Upload className="h-3.5 w-3.5" />
          {showUpload ? 'إغلاق' : 'رفع ملف جديد'}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <UploadForm patientId={patientId} onDone={() => setShowUpload(false)} />
      )}

      {/* File list or empty state */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{tTab('emptyFiles')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <FileListItem key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
