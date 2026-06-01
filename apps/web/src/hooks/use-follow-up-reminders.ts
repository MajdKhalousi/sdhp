import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ReminderChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL';

interface CreateReminderBody {
  channel?: ReminderChannel;
}

interface ReminderResult {
  id: string;
  encounterId: string;
  channel: ReminderChannel;
  status: string;
  scheduledFor: string;
  createdAt: string;
}

export function useCreateReminder() {
  return useMutation({
    mutationFn: ({
      encounterId,
      body,
    }: {
      encounterId: string;
      body?: CreateReminderBody;
    }) => api.post<ReminderResult>(`/v1/follow-ups/${encounterId}/reminders`, body ?? {}),
  });
}
