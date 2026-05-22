'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStartEncounter } from '@/hooks/use-encounters';

interface StartEncounterButtonProps {
  patientId: string;
  doctorId: string;
  appointmentId: string;
}

export function StartEncounterButton({ patientId, doctorId, appointmentId }: StartEncounterButtonProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const { mutate, isPending } = useStartEncounter();

  function handleStart() {
    setError('');
    mutate(
      { patientId, doctorId, appointmentId },
      {
        onSuccess: (encounter) => {
          router.push(`/dashboard/doctor/encounter/${encounter.id}`);
        },
        onError: (e) => {
          setError(e instanceof Error ? e.message : 'Failed to start encounter');
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleStart}
        disabled={isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            Starting…
          </>
        ) : (
          'Start Visit'
        )}
      </button>
      {error && (
        <p className="max-w-[16rem] text-end text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
