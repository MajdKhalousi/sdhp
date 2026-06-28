'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCreateMedicalServiceRequest } from '@/hooks/use-medical-service-requests';
import { useDoctorsList } from '@/hooks/use-appointments';
import { ServicePicker } from '@/components/billing/service-picker';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import { useToast } from '@/hooks/use-toast';
import type { Service } from '@/types/clinic-settings';

interface Props {
  patientId: string;
  onClose: () => void;
}

export function MedicalServiceRequestForm({ patientId, onClose }: Props) {
  const t = useTranslations('medicalServiceRequests.form');
  const tRoot = useTranslations();

  const [serviceId, setServiceId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: doctorsData, isLoading: doctorsLoading } = useDoctorsList();
  const activeDoctors = doctorsData?.data.filter((d) => d.isActive !== false) ?? [];

  const { toast } = useToast();
  const { mutate, isPending, error: mutationError } = useCreateMedicalServiceRequest();

  function handleServiceChange(id: string, _service: Service | null) {
    setServiceId(id);
    setValidationError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!serviceId) {
      setValidationError(t('validation.serviceRequired'));
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      setValidationError(t('validation.quantityMin'));
      return;
    }

    mutate(
      {
        patientId,
        serviceId,
        ...(doctorId ? { doctorId } : {}),
        quantity: qty,
        ...(notes ? { notes } : {}),
      },
      {
        onSuccess: () => {
          toast({ title: t('createSuccess'), variant: 'success' });
          onClose();
        },
      },
    );
  }

  const apiError = mutationError ? getFriendlyApiErrorMessage(mutationError, tRoot) : null;
  const displayError = validationError || apiError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="msr-form-title"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id="msr-form-title" className="text-base font-semibold">
            {t('title')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {displayError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          <ServicePicker value={serviceId} onChange={handleServiceChange} disabled={isPending} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="msr-doctor">
              {t('doctorLabel')}
            </label>
            <select
              id="msr-doctor"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={isPending || doctorsLoading}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">
                {doctorsLoading ? t('loadingDoctors') : t('noDoctorSelected')}
              </option>
              {activeDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.firstName} {d.user.lastName}
                  {d.specialization ? ` — ${d.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="msr-quantity">
              {t('quantityLabel')} <span className="text-destructive">*</span>
            </label>
            <input
              id="msr-quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isPending}
              dir="ltr"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="msr-notes">
              {t('notesLabel')}
            </label>
            <textarea
              id="msr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder={t('notesPlaceholder')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t('submitting') : t('submit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {tRoot('common.actions.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
