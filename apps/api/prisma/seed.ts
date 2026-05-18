import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Organizations ──────────────────────────────────────────────────────────
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

  // ── Users ─────────────────────────────────────────────────────────────────
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

  // SUPER_ADMIN — organizationId is required by the FK but transcended at app level
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
      organizationId: org1.id,
    },
  });

  // ── Branches ──────────────────────────────────────────────────────────────
  // Org1 branches
  await prisma.branch.upsert({
    where: { id: 'seed-branch-001' },
    update: {},
    create: {
      id: 'seed-branch-001',
      organizationId: org1.id,
      name: 'Damascus Main Branch',
      nameAr: 'الفرع الرئيسي - دمشق',
      address: 'Damascus, Syria',
      phone: '+963112000001',
    },
  });

  await prisma.branch.upsert({
    where: { id: 'seed-branch-002' },
    update: {},
    create: {
      id: 'seed-branch-002',
      organizationId: org1.id,
      name: 'Damascus South Branch',
      nameAr: 'فرع دمشق الجنوبي',
      address: 'Damascus South, Syria',
      phone: '+963112000002',
    },
  });

  // Org2 branch — must NOT be accessible by org1 ORG_ADMIN
  await prisma.branch.upsert({
    where: { id: 'seed-branch-003' },
    update: { deletedAt: null, isActive: true },
    create: {
      id: 'seed-branch-003',
      organizationId: org2.id,
      name: 'Aleppo Main Branch',
      nameAr: 'الفرع الرئيسي - حلب',
      address: 'Aleppo, Syria',
      phone: '+963212000001',
    },
  });

  // ── Departments ───────────────────────────────────────────────────────────
  await prisma.department.upsert({
    where: { id: 'seed-dept-001' },
    update: { deletedAt: null, isActive: true },
    create: {
      id: 'seed-dept-001',
      organizationId: org1.id,
      branchId: 'seed-branch-001',
      name: 'Cardiology',
      nameAr: 'قسم القلبية',
      code: 'CARD',
    },
  });

  await prisma.department.upsert({
    where: { id: 'seed-dept-002' },
    update: { deletedAt: null, isActive: true },
    create: {
      id: 'seed-dept-002',
      organizationId: org1.id,
      name: 'General Practice',
      nameAr: 'الطب العام',
      code: 'GP',
    },
  });

  await prisma.department.upsert({
    where: { id: 'seed-dept-003' },
    update: { deletedAt: null, isActive: true },
    create: {
      id: 'seed-dept-003',
      organizationId: org2.id,
      branchId: 'seed-branch-003',
      name: 'Pediatrics',
      nameAr: 'طب الأطفال',
      code: 'PED',
    },
  });

  console.log(`Seed complete — orgs: ${org1.name}, ${org2.name} | branches: 3 | departments: 3`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
