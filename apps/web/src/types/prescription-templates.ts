export interface PrescriptionTemplateItem {
  id?: string;
  medication: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  quantity?: number | null;
  refillsLeft?: number | null;
}

export interface PrescriptionTemplate {
  id: string;
  organizationId: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  items: PrescriptionTemplateItem[];
}

export interface PrescriptionTemplateQuery {
  includeInactive?: boolean;
}

export interface CreatePrescriptionTemplateDto {
  name: string;
  nameAr?: string;
  isActive?: boolean;
  items: PrescriptionTemplateItem[];
}

export interface UpdatePrescriptionTemplateDto {
  name?: string;
  nameAr?: string;
  isActive?: boolean;
  items?: PrescriptionTemplateItem[];
}
