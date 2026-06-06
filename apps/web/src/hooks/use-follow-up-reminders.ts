import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ReminderChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL';
export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export type PatientResponseStatus =
  | 'CONFIRMED'
  | 'NO_RESPONSE'
  | 'DECLINED'
  | 'RESCHEDULE_REQUESTED';

interface CreateReminderBody {
  channel?: ReminderChannel;
}

export interface ReminderItem {
  id: string;
  encounterId: string;
  patientId: string;
  channel: ReminderChannel;
  scheduledFor: string;
  status: ReminderStatus;
  sentAt: string | null;
  failureReason: string | null;
  patientResponse: PatientResponseStatus | null;
  contactNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateReminderBody {
  status: 'SENT' | 'FAILED';
  failureReason?: string;
}

export function useCreateReminder() {
  return useMutation({
    mutationFn: ({
      encounterId,
      body,
    }: {
      encounterId: string;
      body?: CreateReminderBody;
    }) => api.post<ReminderItem>(`/v1/follow-ups/${encounterId}/reminders`, body ?? {}),
  });
}

export function useFollowUpReminders(encounterId: string | null) {
  return useQuery({
    queryKey: ['follow-up-reminders', encounterId],
    queryFn: () => api.get<ReminderItem[]>(`/v1/follow-ups/${encounterId}/reminders`),
    enabled: !!encounterId,
    staleTime: 30_000,
  });
}

export function useUpdateFollowUpReminder() {
  return useMutation({
    mutationFn: ({
      encounterId,
      reminderId,
      body,
    }: {
      encounterId: string;
      reminderId: string;
      body: UpdateReminderBody;
    }) =>
      api.patch<ReminderItem>(
        `/v1/follow-ups/${encounterId}/reminders/${reminderId}`,
        body,
      ),
  });
}

export function useRecordFollowUpResponse() {
  return useMutation({
    mutationFn: ({
      encounterId,
      reminderId,
      patientResponse,
    }: {
      encounterId: string;
      reminderId: string;
      patientResponse: PatientResponseStatus;
    }) =>
      api.patch<ReminderItem>(
        `/v1/follow-ups/${encounterId}/reminders/${reminderId}/response`,
        { patientResponse },
      ),
  });
}
