import { memo } from 'react';
import type { TimelineEvent } from '@/types/timeline';
import { EncounterCard } from './encounter-card';
import { PrescriptionCard } from './prescription-card';
import { LabOrderCard } from './lab-order-card';
import { RadiologyOrderCard } from './radiology-order-card';
import { MedicalFileCard } from './medical-file-card';
import { formatTime } from './format-time';

interface Props {
  event: TimelineEvent;
}

export const TimelineEventCard = memo(function TimelineEventCard({ event }: Props) {
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
    default: {
      const unknown = event as unknown as { type: string; timestamp: string };
      return (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-muted-foreground/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {unknown.type}
            </span>
            <span className="text-xs text-muted-foreground">{formatTime(unknown.timestamp)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Medical event</p>
        </div>
      );
    }
  }
});
