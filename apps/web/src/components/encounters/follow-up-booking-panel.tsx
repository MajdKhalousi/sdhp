'use client';

import { useState } from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useAppointments,
  useCreateAppointment,
  useDoctorsList,
  useVisitTypesList,
} from '@/hooks/use-appointments';
import { AvailableSlotsPicker } from '@/components/appointments/available-slots-picker';
import { Badge } from '@/components/ui/badge';
import type { VisitType } from '@/types/clinic-settings';

const FIELD_CLASS =
  'h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60';

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  encounterId: string;
  patientId: string;
  defaultDoctorId: string;
  followUpDate: string;
}

export function FollowUpBookingPanel({ encounterId, patientId, defaultDoctorId, followUpDate }: Props) {
  const t = useTranslations('encounter.followUpBooking');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';

  const [showForm, setShowForm] = useState(false);
  const [doctorId, setDoctorId] = useState(defaultDoctorId);
  const [date, setDate] = useState(followUpDate.slice(0, 10));
  const [visitTypeId, setVisitTypeId] = useState('');
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [bookError, setBookError] = useState('');

  const { data: apptData } = useAppointments({ patientId, sourceEncounterId: encounterId, limit: 5 });
  const { data: doctorsData } = useDoctorsList();
  const { data: visitTypesData } = useVisitTypesList();
  const { mutate: book, isPending: booking } = useCreateAppointment();

  const bookedAppointment = apptData?.data?.[0] ?? null;

  const selectedDoctor = doctorsData?.data.find((d) => d.id === doctorId) ?? null;
  const durationMin = selectedVisitType?.durationMinutes ?? selectedDoctor?.consultationMinutes ?? 15;

  function handleDoctorChange(newId: string) {
    setDoctorId(newId);
    setSelectedSlot('');
  }

  function handleVisitTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setVisitTypeId(id);
    const vt = visitTypesData?.find((v) => v.id === id) ?? null;
    setSelectedVisitType(vt);
    setSelectedSlot('');
  }

  function handleSubmit() {
    if (!selectedSlot) {
      setBookError(t('form.slotRequired'));
      return;
    }
    setBookError('');
    const scheduledAt = new Date(`${date}T${selectedSlot}:00`).toISOString();
    book(
      {
        patientId,
        doctorId,
        scheduledAt,
        durationMin,
        sourceEncounterId: encounterId,
        ...(visitTypeId ? { visitTypeId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      {
        onSuccess: () => setShowForm(false),
        onError: (e) => setBookError(e instanceof Error ? e.message : t('form.bookingFailed')),
      },
    );
  }

  function handleCancel() {
    setShowForm(false);
    setDoctorId(defaultDoctorId);
    setDate(followUpDate.slice(0, 10));
    setVisitTypeId('');
    setSelectedVisitType(null);
    setSelectedSlot('');
    setNotes('');
    setBookError('');
  }

  if (bookedAppointment) {
    const dr = bookedAppointment.doctor;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="success">
          <CheckCircle2 className="me-1 h-3 w-3" />
          {t('alreadyBooked')}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {t('with')} Dr. {dr.user.firstName} {dr.user.lastName}
          {' · '}
          {formatDate(bookedAppointment.scheduledAt, displayLocale)}
        </span>
        <Link
          href={`/dashboard/appointments?patientId=${patientId}`}
          className="text-xs text-primary hover:underline"
        >
          {t('viewAppointments')}
        </Link>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {t('bookButton')}
      </button>
    );
  }

  const activeVisitTypes = visitTypesData?.filter((v) => v.isActive) ?? [];

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('form.doctorLabel')}</label>
          <select
            value={doctorId}
            onChange={(e) => handleDoctorChange(e.target.value)}
            disabled={booking}
            className={FIELD_CLASS}
          >
            {doctorsData?.data.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.user.firstName} {d.user.lastName}
                {d.specialization ? ` — ${d.specialization}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('form.dateLabel')}</label>
          <input
            type="date"
            dir="ltr"
            value={date}
            onChange={(e) => { setDate(e.target.value); setSelectedSlot(''); }}
            disabled={booking}
            className={FIELD_CLASS}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('form.visitTypeLabel')}</label>
          <select
            value={visitTypeId}
            onChange={handleVisitTypeChange}
            disabled={booking}
            className={FIELD_CLASS}
          >
            <option value="">{t('form.visitTypeOptional')}</option>
            {activeVisitTypes.map((vt) => (
              <option key={vt.id} value={vt.id}>
                {(locale === 'ar' && vt.nameAr) || vt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('form.notesLabel')}</label>
          <input
            type="text"
            dir="auto"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={booking}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="mt-3">
        <AvailableSlotsPicker
          doctorId={doctorId}
          date={date}
          slotDurationMin={durationMin}
          selectedSlot={selectedSlot}
          onSelect={(slot) => setSelectedSlot(slot)}
        />
      </div>

      {bookError && <p className="mt-2 text-xs text-destructive">{bookError}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={booking}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {booking ? t('form.submitting') : t('form.submit')}
        </button>
        <button
          onClick={handleCancel}
          disabled={booking}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </div>
  );
}
