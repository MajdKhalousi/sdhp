import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';

// ── Normalized timeline event shape ───────────────────────────────────────────

export type TimelineEventType = 'APPOINTMENT' | 'QUEUE' | 'ENCOUNTER' | 'PRESCRIPTION';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description?: string;
  sourceId: string;
  source: Record<string, unknown>;
}

// ── Select constants ───────────────────────────────────────────────────────────

const DOCTOR_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  isActive: true,
} as const;

const DOCTOR_SELECT = {
  id: true,
  specialization: true,
  user: { select: DOCTOR_USER_SELECT },
} as const;

const APPT_SELECT = {
  id: true,
  scheduledAt: true,
  durationMin: true,
  status: true,
  notes: true,
  cancelledAt: true,
  cancelReason: true,
  doctor: { select: DOCTOR_SELECT },
  queueEntry: {
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      calledAt: true,
      completedAt: true,
      createdAt: true,
    },
  },
} as const;

const ENCOUNTER_SELECT = {
  id: true,
  appointmentId: true,
  chiefComplaint: true,
  notes: true,
  diagnosis: true,
  diagnosisCode: true,
  treatmentPlan: true,
  followUpDate: true,
  startedAt: true,
  endedAt: true,
  doctor: { select: DOCTOR_SELECT },
} as const;

// vitals (Json?) intentionally excluded — arbitrary JSON has no place in a summary timeline.

const RX_SELECT = {
  id: true,
  encounterId: true,
  medication: true,
  dosage: true,
  frequency: true,
  duration: true,
  instructions: true,
  quantity: true,
  refillsLeft: true,
  createdAt: true,
} as const;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class MedicalTimelineService {
  constructor(private prisma: PrismaService) {}

  async getPatientTimeline(patientId: string, caller: JwtPayload): Promise<TimelineEvent[]> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, organizationId: true, firstName: true, lastName: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Access to this patient timeline is not allowed');
    }

    const [appointments, encounters, prescriptions] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId, deletedAt: null },
        select: APPT_SELECT,
      }),
      this.prisma.encounter.findMany({
        where: { patientId, deletedAt: null },
        select: ENCOUNTER_SELECT,
      }),
      this.prisma.prescription.findMany({
        where: { encounter: { patientId }, deletedAt: null },
        select: RX_SELECT,
      }),
    ]);

    const events: TimelineEvent[] = [];

    for (const appt of appointments) {
      const docName = `Dr. ${appt.doctor.user.firstName} ${appt.doctor.user.lastName}`;
      events.push({
        id: `APPOINTMENT-${appt.id}`,
        type: 'APPOINTMENT',
        date: appt.scheduledAt.toISOString(),
        title: `Appointment with ${docName}`,
        description: appt.notes ?? undefined,
        sourceId: appt.id,
        source: {
          id: appt.id,
          scheduledAt: appt.scheduledAt,
          durationMin: appt.durationMin,
          status: appt.status,
          notes: appt.notes,
          cancelledAt: appt.cancelledAt,
          cancelReason: appt.cancelReason,
          doctor: appt.doctor,
        },
      });

      if (appt.queueEntry) {
        const q = appt.queueEntry;
        events.push({
          id: `QUEUE-${q.id}`,
          type: 'QUEUE',
          date: q.createdAt.toISOString(),
          title: `Queue Check-in — Ticket #${q.ticketNumber}`,
          sourceId: q.id,
          source: {
            id: q.id,
            appointmentId: appt.id,
            ticketNumber: q.ticketNumber,
            status: q.status,
            calledAt: q.calledAt,
            completedAt: q.completedAt,
          },
        });
      }
    }

    for (const enc of encounters) {
      events.push({
        id: `ENCOUNTER-${enc.id}`,
        type: 'ENCOUNTER',
        date: enc.startedAt.toISOString(),
        title: enc.chiefComplaint ?? 'Clinical Visit',
        description: enc.diagnosis ?? enc.notes ?? undefined,
        sourceId: enc.id,
        source: {
          id: enc.id,
          appointmentId: enc.appointmentId,
          chiefComplaint: enc.chiefComplaint,
          notes: enc.notes,
          diagnosis: enc.diagnosis,
          diagnosisCode: enc.diagnosisCode,
          treatmentPlan: enc.treatmentPlan,
          followUpDate: enc.followUpDate,
          startedAt: enc.startedAt,
          endedAt: enc.endedAt,
          doctor: enc.doctor,
        },
      });
    }

    for (const rx of prescriptions) {
      const descParts = [rx.dosage, rx.frequency, rx.duration].filter(Boolean);
      events.push({
        id: `PRESCRIPTION-${rx.id}`,
        type: 'PRESCRIPTION',
        date: rx.createdAt.toISOString(),
        title: `Prescription — ${rx.medication}`,
        description: descParts.length > 0 ? descParts.join(', ') : undefined,
        sourceId: rx.id,
        source: {
          id: rx.id,
          encounterId: rx.encounterId,
          medication: rx.medication,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: rx.instructions,
          quantity: rx.quantity,
          refillsLeft: rx.refillsLeft,
        },
      });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
