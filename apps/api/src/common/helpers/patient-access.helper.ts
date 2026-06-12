import { NotFoundException } from '@nestjs/common';
import { ClinicPatientStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.type';

/**
 * Verifies that an ACTIVE ClinicPatient link exists between the given patient
 * and the caller's organization.
 *
 * Throws NotFoundException (not ForbiddenException) to preserve the 404-masking
 * behavior established in the patients module — callers cannot distinguish
 * "this patient does not exist" from "you have no access to this patient."
 *
 * SUPER_ADMIN bypasses the link check, consistent with every other module.
 */
export async function assertPatientLinkedToOrg(
  prisma: PrismaService,
  patientId: string,
  caller: JwtPayload,
): Promise<void> {
  if (caller.role === UserRole.SUPER_ADMIN) return;

  const link = await prisma.clinicPatient.findFirst({
    where: {
      patientId,
      organizationId: caller.organizationId,
      status: ClinicPatientStatus.ACTIVE,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!link) throw new NotFoundException('Patient not found');
}
