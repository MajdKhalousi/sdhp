export type EmployeeDocumentCategory = 'PHOTO' | 'ID_DOCUMENT' | 'CONTRACT' | 'CERTIFICATE' | 'OTHER';

export interface EmployeeDocument {
  id: string;
  employeeProfileId: string;
  category: EmployeeDocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedById: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface EmployeeDocumentDownloadUrl {
  downloadUrl: string;
  expiresIn: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface EmployeeDocumentUploadUrl {
  uploadUrl: string;
  storageKey: string;
  method: 'PUT';
  expiresIn: number;
}

export interface CreateEmployeeDocumentPayload {
  category: EmployeeDocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}
