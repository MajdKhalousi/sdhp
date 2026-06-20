import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  EmployeeDocument,
  EmployeeDocumentDownloadUrl,
  EmployeeDocumentUploadUrl,
  CreateEmployeeDocumentPayload,
  EmployeeDocumentCategory,
} from '@/types/employee-document';

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

export function useRequestEmployeeDocumentUploadUrl() {
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      fileName,
      mimeType,
      sizeBytes,
      category,
    }: {
      employeeProfileId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      category: EmployeeDocumentCategory;
    }) =>
      api.post<EmployeeDocumentUploadUrl>(`/v1/employees/${employeeProfileId}/documents/upload-url`, {
        fileName,
        mimeType,
        sizeBytes,
        category,
      }),
  });
}

export function useRegisterEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      dto,
    }: {
      employeeProfileId: string;
      dto: CreateEmployeeDocumentPayload;
    }) => api.post<EmployeeDocument>(`/v1/employees/${employeeProfileId}/documents`, dto),
    onSuccess: (_, { employeeProfileId }) => {
      qc.invalidateQueries({ queryKey: ['employee-documents', employeeProfileId] });
    },
  });
}

export function useDeleteEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeProfileId, documentId }: { employeeProfileId: string; documentId: string }) =>
      api.delete<void>(`/v1/employees/${employeeProfileId}/documents/${documentId}`),
    onSuccess: (_, { employeeProfileId }) => {
      qc.invalidateQueries({ queryKey: ['employee-documents', employeeProfileId] });
    },
  });
}
