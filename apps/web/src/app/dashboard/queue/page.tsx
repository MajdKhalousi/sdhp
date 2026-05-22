import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { QueueBoard } from '@/components/queue/queue-board';

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Queue</h1>
          <p className="text-sm text-muted-foreground">Live reception queue — auto-refreshes every 30s</p>
        </div>
        <Link
          href="/dashboard/queue/check-in"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Walk-in
        </Link>
      </div>

      <QueueBoard />
    </div>
  );
}
