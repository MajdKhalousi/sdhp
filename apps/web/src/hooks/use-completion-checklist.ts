import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LabOrderStatus, RadiologyOrderStatus } from '@/types/timeline';

const LAB_PENDING = new Set<LabOrderStatus>(['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS']);
const RAD_PENDING = new Set<RadiologyOrderStatus>(['ORDERED', 'SCHEDULED', 'IN_PROGRESS']);

export type ChecklistItemStatus = 'warn' | 'info';

export interface ChecklistItem {
  key: string;
  status: ChecklistItemStatus;
  section: 'clinical' | 'orders' | 'billing';
  labelKey: string;
  count?: number;
}

export interface CompletionChecklistInput {
  encounterId: string;
  patientId: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  notes: string;
  diagnosis: string;
  treatmentPlan: string;
  patientInstructions: string;
  followUpDate: string;
  vitalsEmpty: boolean;
  hasUnpaidInvoice: boolean;
  enabled: boolean;
}

interface PresResponse {
  data: { id: string }[];
  total: number;
}

interface OrderListItem {
  id: string;
  encounterId: string | null;
  status: string;
}

interface ReportListItem {
  id: string;
  status: string;
}

export function useCompletionChecklist(input: CompletionChecklistInput) {
  const { encounterId, patientId, enabled } = input;

  // Share cache keys with PrescriptionPanel / LabOrderPanel / RadiologyOrderPanel / ClinicalReportPanel
  // so these queries are free cache-hits when the doctor has already scrolled the page.
  const { data: presData, isLoading: presLoading } = useQuery({
    queryKey: ['prescriptions', 'encounter', encounterId],
    queryFn: () =>
      api.get<PresResponse>('/v1/prescriptions', { encounterId, limit: 50 }),
    enabled: enabled && !!encounterId,
    staleTime: 30_000,
  });

  const { data: labData, isLoading: labLoading } = useQuery({
    queryKey: ['patient-lab-orders', patientId],
    queryFn: () => api.get<OrderListItem[]>(`/v1/patients/${patientId}/lab-orders`),
    enabled: enabled && !!patientId,
    staleTime: 30_000,
  });

  const { data: radData, isLoading: radLoading } = useQuery({
    queryKey: ['patient-radiology-orders', patientId],
    queryFn: () => api.get<OrderListItem[]>(`/v1/patients/${patientId}/radiology-orders`),
    enabled: enabled && !!patientId,
    staleTime: 30_000,
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['clinical-reports', { encounterId }],
    queryFn: () =>
      api.get<ReportListItem[]>('/v1/clinical-reports', { encounterId }),
    enabled: enabled && !!encounterId,
    staleTime: 30_000,
  });

  const ordersLoading =
    enabled && (presLoading || labLoading || radLoading || reportLoading);

  const items = useMemo<ChecklistItem[]>(() => {
    if (!enabled) return [];

    const result: ChecklistItem[] = [];

    // ── Clinical (instant — derived from form state) ──────────────────────────
    if (!input.chiefComplaint.trim())
      result.push({ key: 'chiefComplaintMissing', status: 'warn', section: 'clinical', labelKey: 'checks.chiefComplaintMissing' });
    if (!input.diagnosis.trim())
      result.push({ key: 'diagnosisMissing', status: 'warn', section: 'clinical', labelKey: 'checks.diagnosisMissing' });
    if (input.vitalsEmpty)
      result.push({ key: 'vitalsMissing', status: 'warn', section: 'clinical', labelKey: 'checks.vitalsMissing' });
    if (!input.historyOfPresentIllness.trim())
      result.push({ key: 'hpiMissing', status: 'info', section: 'clinical', labelKey: 'checks.hpiMissing' });
    if (!input.notes.trim())
      result.push({ key: 'notesMissing', status: 'info', section: 'clinical', labelKey: 'checks.notesMissing' });
    if (!input.treatmentPlan.trim())
      result.push({ key: 'treatmentPlanMissing', status: 'info', section: 'clinical', labelKey: 'checks.treatmentPlanMissing' });
    if (!input.patientInstructions.trim())
      result.push({ key: 'patientInstructionsMissing', status: 'info', section: 'clinical', labelKey: 'checks.patientInstructionsMissing' });
    if (!input.followUpDate.trim())
      result.push({ key: 'followUpMissing', status: 'info', section: 'clinical', labelKey: 'checks.followUpMissing' });

    // ── Orders (available only after lazy queries resolve) ────────────────────
    if (!ordersLoading) {
      if (presData && (presData.data?.length ?? 0) === 0)
        result.push({ key: 'prescriptionsMissing', status: 'info', section: 'orders', labelKey: 'checks.prescriptionsMissing' });

      if (labData) {
        const pending = labData.filter(
          (o) => o.encounterId === encounterId && LAB_PENDING.has(o.status as LabOrderStatus),
        );
        if (pending.length > 0)
          result.push({ key: 'labsPending', status: 'warn', section: 'orders', labelKey: 'checks.labsPending', count: pending.length });
      }

      if (radData) {
        const pending = radData.filter(
          (o) => o.encounterId === encounterId && RAD_PENDING.has(o.status as RadiologyOrderStatus),
        );
        if (pending.length > 0)
          result.push({ key: 'radiologyPending', status: 'warn', section: 'orders', labelKey: 'checks.radiologyPending', count: pending.length });
      }

      if (reportData && reportData.filter((r) => r.status === 'FINALIZED').length === 0)
        result.push({ key: 'reportMissing', status: 'info', section: 'orders', labelKey: 'checks.reportMissing' });
    }

    // ── Billing (instant — derived from workspace invoice query) ─────────────
    if (input.hasUnpaidInvoice)
      result.push({ key: 'unpaidInvoice', status: 'warn', section: 'billing', labelKey: 'checks.unpaidInvoice' });

    return result;
  }, [
    enabled, ordersLoading,
    input.chiefComplaint, input.historyOfPresentIllness, input.notes, input.diagnosis,
    input.treatmentPlan, input.patientInstructions, input.followUpDate,
    input.vitalsEmpty, input.hasUnpaidInvoice,
    presData, labData, radData, reportData, encounterId,
  ]);

  return {
    items,
    ordersLoading,
    hasWarnings: items.some((i) => i.status === 'warn'),
  };
}
