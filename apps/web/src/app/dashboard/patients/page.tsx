'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/hooks/use-patient';

interface PatientsResponse {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
}

export default function PatientsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<PatientsResponse>('/v1/patients?limit=50'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} patient${data.total !== 1 ? 's' : ''} registered` : ' '}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load patients. Please refresh the page.
        </div>
      )}

      {data && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">MRN</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((patient) => (
                <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {patient.firstName} {patient.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {patient.mrn}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={patient.isActive ? 'success' : 'outline'}>
                      {patient.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.data.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No patients found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
