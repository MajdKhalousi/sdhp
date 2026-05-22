'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, UserX } from 'lucide-react';
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatGender(raw: string | null): string {
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['patients', 'list'],
    queryFn: () => api.get<PatientsResponse>('/v1/patients', { limit: 100 }),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.data;
    return data.data.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Patients</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `${data.total} patient${data.total !== 1 ? 's' : ''} registered`
              : ' '}
          </p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, MRN, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : 'Failed to load patients'}
          </p>
          <button
            onClick={() => refetch()}
            className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <UserX className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">No patients found</p>
              <p className="text-xs text-muted-foreground">
                {search ? 'Try a different name, MRN, or phone number.' : 'No patients registered yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">MRN</th>
                      <th className="px-4 py-3">Date of Birth</th>
                      <th className="px-4 py-3">Gender</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((patient) => (
                      <tr
                        key={patient.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {patient.firstName} {patient.lastName}
                            {patient.firstNameAr && (
                              <span
                                className="ml-2 text-xs font-normal text-muted-foreground"
                                dir="rtl"
                              >
                                {patient.firstNameAr} {patient.lastNameAr}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {patient.mrn}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(patient.dateOfBirth)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatGender(patient.gender)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {patient.phone ?? '—'}
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
              </div>
            </div>
          )}

          {search && filtered.length < data.total && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {data.total} patients
            </p>
          )}
        </>
      )}
    </div>
  );
}
