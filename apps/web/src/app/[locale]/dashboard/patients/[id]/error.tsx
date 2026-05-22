'use client';

import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset(): void;
}

function classify(message: string): '404' | '403' | '401' | 'generic' {
  const m = message.toLowerCase();
  if (m.includes('not found') || m.includes('404')) return '404';
  if (m.includes('not allowed') || m.includes('forbidden') || m.includes('403')) return '403';
  if (m.includes('session expired') || m.includes('unauthorized') || m.includes('401')) return '401';
  return 'generic';
}

export default function PatientError({ error, reset }: ErrorProps) {
  const kind = classify(error.message);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="space-y-4 max-w-sm">
        {kind === '404' && (
          <>
            <p className="text-4xl font-bold text-muted-foreground">404</p>
            <h2 className="text-lg font-semibold">Patient not found</h2>
            <p className="text-sm text-muted-foreground">
              This patient record does not exist or has been deleted.
            </p>
          </>
        )}

        {kind === '403' && (
          <>
            <p className="text-4xl font-bold text-muted-foreground">403</p>
            <h2 className="text-lg font-semibold">Access denied</h2>
            <p className="text-sm text-muted-foreground">
              You do not have permission to view this patient&apos;s records.
            </p>
          </>
        )}

        {kind === '401' && (
          <>
            <p className="text-4xl font-bold text-muted-foreground">401</p>
            <h2 className="text-lg font-semibold">Session expired</h2>
            <p className="text-sm text-muted-foreground">
              Your session has expired. Please sign in again.
            </p>
          </>
        )}

        {kind === 'generic' && (
          <>
            <p className="text-4xl font-bold text-muted-foreground">Error</p>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred.'}
            </p>
          </>
        )}

        <div className="flex justify-center gap-3 pt-2">
          {kind === 'generic' && (
            <button
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
          )}
          {kind === '401' ? (
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          ) : (
            <Link
              href="/dashboard/patients"
              className="rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Back to Patients
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
