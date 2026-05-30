export type ScheduleExceptionType = 'HOLIDAY' | 'LEAVE' | 'CUSTOM_HOURS';

export interface DoctorScheduleDay {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ScheduleException {
  id: string;
  doctorId: string;
  date: string;
  type: ScheduleExceptionType;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ScheduleDayItemDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface UpsertDoctorScheduleDto {
  days: ScheduleDayItemDto[];
}

export interface CreateScheduleExceptionDto {
  date: string;
  type: ScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface UpdateScheduleExceptionDto {
  type?: ScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface AvailableSlot {
  time: string;
  available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  slotDurationMin: number;
  workingHours?: { start: string; end: string };
  slots: AvailableSlot[];
}

export interface AvailableSlotsQuery {
  date: string;
  slotDurationMin?: number;
}
