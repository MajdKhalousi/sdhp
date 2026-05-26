'use client';

import { useState } from 'react';
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
  { value: '', label: 'غير محدد' },
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
    if (!values.firstName.trim()) errs.firstName = 'الاسم الأول مطلوب';
    if (!values.lastName.trim()) errs.lastName = 'اسم العائلة مطلوب';
    if (!values.gender) errs.gender = 'الجنس مطلوب';
    if (!values.dateOfBirth) errs.dateOfBirth = 'تاريخ الميلاد مطلوب';
    if (!values.phone.trim()) errs.phone = 'رقم الهاتف مطلوب';
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      errs.email = 'صيغة البريد الإلكتروني غير صحيحة';
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
      allergies: values.allergies.trim() || null,
      chronicDiseases: values.chronicDiseases.trim() || null,
      emergencyContactName: values.emergencyContactName.trim() || null,
      emergencyContactPhone: values.emergencyContactPhone.trim() || null,
    };

    void onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">

        {/* ── Basic information ─────────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">المعلومات الأساسية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel required>الاسم الأول</FieldLabel>
              <input
                type="text"
                value={values.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className={inputClass(!!errors.firstName)}
                placeholder="الاسم الأول"
                disabled={isSubmitting}
              />
              <FieldError message={errors.firstName} />
            </div>

            <div>
              <FieldLabel required>اسم العائلة</FieldLabel>
              <input
                type="text"
                value={values.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className={inputClass(!!errors.lastName)}
                placeholder="اسم العائلة"
                disabled={isSubmitting}
              />
              <FieldError message={errors.lastName} />
            </div>

            <div>
              <FieldLabel required>الجنس</FieldLabel>
              <select
                value={values.gender}
                onChange={(e) => set('gender', e.target.value)}
                className={inputClass(!!errors.gender)}
                disabled={isSubmitting}
              >
                <option value="">اختر الجنس</option>
                <option value="MALE">ذكر</option>
                <option value="FEMALE">أنثى</option>
                <option value="OTHER">آخر</option>
              </select>
              <FieldError message={errors.gender} />
            </div>

            <div>
              <FieldLabel required>تاريخ الميلاد</FieldLabel>
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
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">بيانات التواصل</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel required>رقم الهاتف</FieldLabel>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputClass(!!errors.phone)}
                placeholder="+963..."
                disabled={isSubmitting}
                dir="ltr"
              />
              <FieldError message={errors.phone} />
            </div>

            <div>
              <FieldLabel>البريد الإلكتروني</FieldLabel>
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
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">معلومات إضافية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel>الرقم الوطني</FieldLabel>
              <input
                type="text"
                value={values.nationalId}
                onChange={(e) => set('nationalId', e.target.value)}
                className={inputClass()}
                placeholder="الرقم الوطني"
                disabled={isSubmitting}
                dir="ltr"
              />
            </div>

            <div>
              <FieldLabel>فصيلة الدم</FieldLabel>
              <select
                value={values.bloodType}
                onChange={(e) => set('bloodType', e.target.value)}
                className={inputClass()}
                disabled={isSubmitting}
              >
                {BLOOD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>العنوان</FieldLabel>
              <input
                type="text"
                value={values.address}
                onChange={(e) => set('address', e.target.value)}
                className={inputClass()}
                placeholder="العنوان"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>المدينة</FieldLabel>
              <input
                type="text"
                value={values.city}
                onChange={(e) => set('city', e.target.value)}
                className={inputClass()}
                placeholder="المدينة"
                disabled={isSubmitting}
              />
            </div>

          </div>
        </div>

        {/* ── Medical information ───────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">المعلومات الطبية</h2>
          <div className="grid grid-cols-1 gap-4">

            <div>
              <FieldLabel>الحساسيات</FieldLabel>
              <textarea
                value={values.allergies}
                onChange={(e) => set('allergies', e.target.value)}
                className={`${inputClass()} resize-none`}
                rows={2}
                placeholder="اذكر الحساسيات إن وجدت"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>الأمراض المزمنة</FieldLabel>
              <textarea
                value={values.chronicDiseases}
                onChange={(e) => set('chronicDiseases', e.target.value)}
                className={`${inputClass()} resize-none`}
                rows={2}
                placeholder="اذكر الأمراض المزمنة إن وجدت"
                disabled={isSubmitting}
              />
            </div>

          </div>
        </div>

        {/* ── Emergency contact ─────────────────────────── */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">جهة الاتصال الطارئة</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <FieldLabel>اسم جهة الاتصال</FieldLabel>
              <input
                type="text"
                value={values.emergencyContactName}
                onChange={(e) => set('emergencyContactName', e.target.value)}
                className={inputClass()}
                placeholder="الاسم الكامل"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>رقم هاتف جهة الاتصال</FieldLabel>
              <input
                type="tel"
                value={values.emergencyContactPhone}
                onChange={(e) => set('emergencyContactPhone', e.target.value)}
                className={inputClass()}
                placeholder="+963..."
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
              إلغاء
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting
              ? 'جارٍ الحفظ...'
              : mode === 'create'
              ? 'إضافة المريض'
              : 'حفظ التعديلات'}
          </button>
        </div>

      </div>
    </form>
  );
}
