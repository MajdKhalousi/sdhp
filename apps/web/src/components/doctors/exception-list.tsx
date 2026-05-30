'use client';

import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useScheduleExceptions,
  useCreateException,
  useUpdateException,
  useDeleteException,
} from '@/hooks/use-doctor-schedules';
import { Skeleton } from '@/components/ui/skeleton';
import { ExceptionForm } from './add-exception-form';
import type { ScheduleException } from '@/types/doctor-schedule';

const COL_COUNT = 5;

function formatHours(exc: ScheduleException, fullDayLabel: string): string {
  if (exc.type === 'CUSTOM_HOURS' && exc.startTime && exc.endTime) {
    return `${exc.startTime} – ${exc.endTime}`;
  }
  return fullDayLabel;
}

export function ExceptionList({ doctorId }: { doctorId: string }) {
  const t       = useTranslations('doctors.schedule.exceptions');
  const tCommon = useTranslations('common');

  const exceptions = useScheduleExceptions(doctorId);
  const create     = useCreateException(doctorId);
  const update     = useUpdateException(doctorId);
  const deleteMut  = useDeleteException(doctorId);

  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items: ScheduleException[] = exceptions.data ?? [];

  if (exceptions.isLoading) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (exceptions.isError) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">{t('heading')}</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
          <button
            onClick={() => exceptions.refetch()}
            className="mt-2 text-sm text-primary hover:underline"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">{t('heading')}</h2>
        <button
          type="button"
          onClick={() => {
            setExpandedId(expandedId === 'new' ? null : 'new');
            setDeletingId(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('newException')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.date')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.type')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.hours')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.reason')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {/* New exception inline form */}
            {expandedId === 'new' && (
              <tr>
                <td colSpan={COL_COUNT} className="border-b bg-muted/20 px-4 py-4">
                  <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                  <ExceptionForm
                    mode="create"
                    create={create}
                    update={update}
                    onDone={() => setExpandedId(null)}
                  />
                </td>
              </tr>
            )}

            {/* Empty state */}
            {items.length === 0 && expandedId !== 'new' && (
              <tr>
                <td colSpan={COL_COUNT} className="px-4 py-8 text-center">
                  <p className="font-medium text-muted-foreground">{t('empty.heading')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('empty.subtext')}</p>
                </td>
              </tr>
            )}

            {/* Exception rows */}
            {items.map((exc) => (
              <Fragment key={exc.id}>
                {/* Main row */}
                <tr className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{exc.date}</td>
                  <td className="px-4 py-3">
                    {t(`type.${exc.type}` as Parameters<typeof t>[0])}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {formatHours(exc, t('fullDay'))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {exc.reason ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(expandedId === exc.id ? null : exc.id);
                          setDeletingId(null);
                        }}
                        className="inline-flex items-center justify-center rounded border border-input p-1.5 transition-colors hover:bg-muted"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingId(deletingId === exc.id ? null : exc.id);
                          setExpandedId(null);
                        }}
                        className="inline-flex items-center justify-center rounded border border-input p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Edit form expansion */}
                {expandedId === exc.id && (
                  <tr>
                    <td colSpan={COL_COUNT} className="border-b bg-muted/20 px-4 py-4">
                      <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                      <ExceptionForm
                        mode="edit"
                        initial={exc}
                        create={create}
                        update={update}
                        onDone={() => setExpandedId(null)}
                      />
                    </td>
                  </tr>
                )}

                {/* Delete confirmation strip */}
                {deletingId === exc.id && (
                  <tr>
                    <td colSpan={COL_COUNT} className="border-b bg-destructive/5 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-destructive">{t('deleteConfirm')}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="rounded border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            {tCommon('actions.cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={deleteMut.isPending}
                            onClick={async () => {
                              try {
                                await deleteMut.mutateAsync(exc.id);
                                setDeletingId(null);
                              } catch {}
                            }}
                            className="inline-flex items-center gap-1.5 rounded bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                          >
                            {deleteMut.isPending ? (
                              t('deleting')
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3" />
                              </>
                            )}
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
  );
}
