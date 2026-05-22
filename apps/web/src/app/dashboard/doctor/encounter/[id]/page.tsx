import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EncounterWorkspace } from '@/components/encounters/encounter-workspace';

interface Props {
  params: { id: string };
}

export default function EncounterPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/doctor/queue"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          aria-label="Back to queue"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Active Visit</h1>
          <p className="text-sm text-muted-foreground">Document clinical findings and close the visit when complete</p>
        </div>
      </div>

      <EncounterWorkspace encounterId={params.id} />
    </div>
  );
}
