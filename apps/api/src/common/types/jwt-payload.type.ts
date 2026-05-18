import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  organizationId: string;
  branchId: string | null;
}
