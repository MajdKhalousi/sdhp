import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EmployeeDocument, EmployeeDocumentDownloadUrl } from '@/types/employee-document';

export function useEmployeeDocuments(employeeProfileId: string) {
  return useQuery({
    queryKey: ['employee-documents', employeeProfileId],
    queryFn: () => api.get<EmployeeDocument[]>(`/v1/employees/${employeeProfileId}/documents`),
    staleTime: 30_000,
    enabled: !!employeeProfileId,
  });
}

export function useEmployeeDocumentDownloadUrl() {
  return useMutation({
    mutationFn: ({ employeeProfileId, documentId }: { employeeProfileId: string; documentId: string }) =>
      api.get<EmployeeDocumentDownloadUrl>(`/v1/employees/${employeeProfileId}/documents/${documentId}/download-url`),
  });
}
