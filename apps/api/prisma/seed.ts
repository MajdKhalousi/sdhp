import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-001' },
    update: {},
    create: {
      id: 'seed-org-001',
      name: 'Demo Hospital',
      nameAr: 'مشفى تجريبي',
      type: 'HOSPITAL',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { phone: '+963912345678' },
    update: {},
    create: {
      phone: '+963912345678',
      email: 'admin@demo.sdhp',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ORG_ADMIN,
      organizationId: org.id,
    },
  });

  console.log('Seed complete — org:', org.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
