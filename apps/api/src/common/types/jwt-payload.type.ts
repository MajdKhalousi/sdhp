import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  organizationId: string;
  branchId: string | null;
}
