import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WalkInWizard } from '@/components/queue/walk-in-wizard';

export default function WalkInPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/queue"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          aria-label="Back to queue"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Check In Patient</h1>
          <p className="text-sm text-muted-foreground">Create an appointment and issue a queue ticket</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <WalkInWizard />
      </div>
    </div>
  );
}
