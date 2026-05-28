'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  Patient,
  PatientGender,
  CreatePatientInput,
  UpdatePatientInput,
} from '@/hooks/use-patient';

interface PatientFormProps {
  mode: 'create' | 'edit';
  initialPatient?: Patient;
  onSubmit: (data: CreatePatientInput | UpdatePatientInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  gender: PatientGender | '';
  dateOfBirth: string;
  phone: string;
  email: string;
  nationalId: string;
  address: string;
  city: string;
  bloodType: string;
  allergies: string;
  chronicDiseases: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BLOOD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'A_POS', label: 'A+' },
  { value: 'A_NEG', label: 'A-' },
  { value: 'B_POS', label: 'B+' },
  { value: 'B_NEG', label: 'B-' },
  { value: 'AB_POS', label: 'AB+' },
  { value: 'AB_NEG', label: 'AB-' },
  { value: 'O_POS', label: 'O+' },
  { value: 'O_NEG', label: 'O-' },
];

function initState(mode: 'create' | 'edit', p?: Patient): FormState {
  if (mode === 'edit' && p) {
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      gender: (p.gender as PatientGender | null) ?? '',
      dateOfBirth: p.dateOfBirth ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      nationalId: p.nationalId ?? '',
      address: p.address ?? '',
      city: p.city ?? '',
      bloodType: p.bloodType ?? '',
      allergies: '',
      chronicDiseases: p.chronicDiseases ?? '',
      emergencyContactName: p.emergencyContactName ?? p.emergencyName ?? '',
      emergencyContactPhone: p.emergencyContactPhone ?? p.emergencyPhone ?? '',
    };
  }
  return {
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    nationalId: '',
    address: '',
    city: '',
    bloodType: '',
    allergies: '',
    chronicDiseases: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
}

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

export function PatientForm({
  mode,
  initialPatient,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PatientFormProps) {
  const t = useTranslations('patient.form');
  const [values, setValues] = useState<FormState>(() => initState(mode, initialPatient));
  const [errors, setErrors] = useState<FormErrors>({});

  function set(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.firstName.trim()) errs.firstName = t('validation.firstNameRequired');
    if (!values.lastName.trim()) errs.lastName = t('validation.lastNameRequired');
    if (!values.gender) errs.gender = t('validation.genderRequired');
    if (!values.dateOfBirth) errs.dateOfBirth = t('validation.dobRequired');
    if (!values.phone.trim()) errs.phone = t('validation.phoneRequired');
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      errs.email = t('validation.invalidEmail');
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload: CreatePatientInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      gender: values.gender as PatientGender,
      dateOfBirth: values.dateOfBirth,
      phone: values.phone.trim(),
      email: values.email.trim() || null,
      nationalId: values.nationalId.trim() || null,
      address: values.address.trim() || null,
      city: values.city.trim() || null,
      bloodType: values.bloodType || null,
      chronicDiseases: values.chronicDiseases.trim() || null,
      emergencyName: values.emergencyContactName.trim() || null,
      emergencyPhone: values.emergencyContactPhone.trim() || null,
    };

    void onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">

        {/* ── Basic information ─────────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{t('sections.basicInfo')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel required>{t('fields.firstName')}</FieldLabel>
              <input
                type="text"
                value={values.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className={inputClass(!!errors.firstName)}
                placeholder={t('placeholders.firstName')}
                disabled={isSubmitting}
              />
              <FieldError message={errors.firstName} />
            </div>

            <div>
              <FieldLabel required>{t('fields.lastName')}</FieldLabel>
              <input
                type="text"
                value={values.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className={inputClass(!!errors.lastName)}
                placeholder={t('placeholders.lastName')}
                disabled={isSubmitting}
              />
              <FieldError message={errors.lastName} />
            </div>

            <div>
              <FieldLabel required>{t('fields.gender')}</FieldLabel>
              <select
                value={values.gender}
                onChange={(e) => set('gender', e.target.value)}
                className={inputClass(!!errors.gender)}
                disabled={isSubmitting}
              >
                <option value="">{t('gender.selectPrompt')}</option>
                <option value="MALE">{t('gender.male')}</option>
                <option value="FEMALE">{t('gender.female')}</option>
                <option value="OTHER">{t('gender.other')}</option>
              </select>
              <FieldError message={errors.gender} />
            </div>

            <div>
              <FieldLabel required>{t('fields.dateOfBirth')}</FieldLabel>
              <input
                type="date"
                value={values.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                className={inputClass(!!errors.dateOfBirth)}
                disabled={isSubmitting}
                dir="ltr"
              />
              <FieldError message={errors.dateOfBirth} />
            </div>

          </div>
        </div>

        {/* ── Contact ───────────────────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{t('sections.contact')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel required>{t('fields.phone')}</FieldLabel>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputClass(!!errors.phone)}
                placeholder={t('placeholders.phone')}
                disabled={isSubmitting}
                dir="ltr"
              />
              <FieldError message={errors.phone} />
            </div>

            <div>
              <FieldLabel>{t('fields.email')}</FieldLabel>
              <input
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass(!!errors.email)}
                placeholder="example@email.com"
                disabled={isSubmitting}
                dir="ltr"
              />
              <FieldError message={errors.email} />
            </div>

          </div>
        </div>

        {/* ── Additional information ────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{t('sections.additional')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel>{t('fields.nationalId')}</FieldLabel>
              <input
                type="text"
                value={values.nationalId}
                onChange={(e) => set('nationalId', e.target.value)}
                className={inputClass()}
                placeholder={t('placeholders.nationalId')}
                disabled={isSubmitting}
                dir="ltr"
              />
            </div>

            <div>
              <FieldLabel>{t('fields.bloodType')}</FieldLabel>
              <select
                value={values.bloodType}
                onChange={(e) => set('bloodType', e.target.value)}
                className={inputClass()}
                disabled={isSubmitting}
              >
                <option value="">{t('bloodType.unspecified')}</option>
                {BLOOD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>{t('fields.address')}</FieldLabel>
              <input
                type="text"
                value={values.address}
                onChange={(e) => set('address', e.target.value)}
                className={inputClass()}
                placeholder={t('placeholders.address')}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>{t('fields.city')}</FieldLabel>
              <input
                type="text"
                value={values.city}
                onChange={(e) => set('city', e.target.value)}
                className={inputClass()}
                placeholder={t('placeholders.city')}
                disabled={isSubmitting}
              />
            </div>

          </div>
        </div>

        {/* ── Medical information ───────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{t('sections.medical')}</h2>
          <div className="grid grid-cols-1 gap-4">

            <div>
              <FieldLabel>{t('fields.allergies')}</FieldLabel>
              <textarea
                value={values.allergies}
                onChange={(e) => set('allergies', e.target.value)}
                className={`${inputClass()} resize-none`}
                rows={2}
                placeholder={t('placeholders.allergies')}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>{t('fields.chronicDiseases')}</FieldLabel>
              <textarea
                value={values.chronicDiseases}
                onChange={(e) => set('chronicDiseases', e.target.value)}
                className={`${inputClass()} resize-none`}
                rows={2}
                placeholder={t('placeholders.chronicDiseases')}
                disabled={isSubmitting}
              />
            </div>

          </div>
        </div>

        {/* ── Emergency contact ─────────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{t('sections.emergency')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel>{t('fields.emergencyName')}</FieldLabel>
              <input
                type="text"
                value={values.emergencyContactName}
                onChange={(e) => set('emergencyContactName', e.target.value)}
                className={inputClass()}
                placeholder={t('placeholders.emergencyName')}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>{t('fields.emergencyPhone')}</FieldLabel>
              <input
                type="tel"
                value={values.emergencyContactPhone}
                onChange={(e) => set('emergencyContactPhone', e.target.value)}
                className={inputClass()}
                placeholder={t('placeholders.phone')}
                disabled={isSubmitting}
                dir="ltr"
              />
            </div>

          </div>
        </div>

        {/* ── Actions ───────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {t('actions.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting
              ? (mode === 'create' ? t('actions.creating') : t('actions.saving'))
              : (mode === 'create' ? t('actions.create') : t('actions.save'))}
          </button>
        </div>

      </div>
    </form>
  );
}
