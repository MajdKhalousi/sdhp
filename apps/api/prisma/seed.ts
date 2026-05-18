import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Org 1 — used by the ORG_ADMIN seed user
  const org1 = await prisma.organization.upsert({
    where: { id: 'seed-org-001' },
    update: {},
    create: {
      id: 'seed-org-001',
      name: 'Demo Hospital',
      nameAr: 'مشفى تجريبي',
      type: 'HOSPITAL',
    },
  });

  // Org 2 — exists to verify cross-org isolation (ORG_ADMIN of org1 must not access this)
  const org2 = await prisma.organization.upsert({
    where: { id: 'seed-org-002' },
    update: {},
    create: {
      id: 'seed-org-002',
      name: 'Aleppo Clinic',
      nameAr: 'عيادة حلب',
      type: 'CLINIC',
    },
  });

  // ORG_ADMIN for org1
  await prisma.user.upsert({
    where: { phone: '+963912345678' },
    update: {},
    create: {
      phone: '+963912345678',
      email: 'admin@demo.sdhp',
      passwordHash,
      firstName: 'Ahmad',
      lastName: 'Khalil',
      role: UserRole.ORG_ADMIN,
      organizationId: org1.id,
    },
  });

  // SUPER_ADMIN — no org affiliation restriction, can access all
  await prisma.user.upsert({
    where: { phone: '+963900000001' },
    update: {},
    create: {
      phone: '+963900000001',
      email: 'superadmin@sdhp',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      organizationId: org1.id, // required by schema FK — SUPER_ADMIN transcends this at app level
    },
  });

  console.log(`Seed complete — orgs: ${org1.name}, ${org2.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
