import type { TimelineEvent } from '@/types/timeline';
import { EncounterCard } from './encounter-card';
import { PrescriptionCard } from './prescription-card';
import { LabOrderCard } from './lab-order-card';
import { RadiologyOrderCard } from './radiology-order-card';
import { MedicalFileCard } from './medical-file-card';

interface Props {
  event: TimelineEvent;
}

export function TimelineEventCard({ event }: Props) {
  switch (event.type) {
    case 'ENCOUNTER':
      return <EncounterCard event={event} />;
    case 'PRESCRIPTION':
      return <PrescriptionCard event={event} />;
    case 'LAB_ORDER':
      return <LabOrderCard event={event} />;
    case 'RADIOLOGY_ORDER':
      return <RadiologyOrderCard event={event} />;
    case 'MEDICAL_FILE':
      return <MedicalFileCard event={event} />;
  }
}
