import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

async function seed() {
  console.log('Seeding initial data...');

  // 1. Company Settings
  await prisma.companySettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      companyName: 'CrewDesk Software Agency',
      currency: 'USD',
      timezone: 'UTC',
      officeStartTime: '09:00',
      lateGraceMinutes: 15,
    },
  });

  // 2. Initial Departments
  const departments = ['Engineering', 'Design & UX', 'DevOps & Cloud', 'QA & SecOps'];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2.5 Default Leave Types (ANNUAL 14, SICK 10, CASUAL 5)
  const defaultLeaveTypes = [
    { name: 'ANNUAL', defaultAllowance: 14 },
    { name: 'SICK', defaultAllowance: 10 },
    { name: 'CASUAL', defaultAllowance: 5 },
  ];
  for (const lt of defaultLeaveTypes) {
    await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: { defaultAllowance: lt.defaultAllowance },
      create: { name: lt.name, defaultAllowance: lt.defaultAllowance },
    });
  }

  // 3. Seed Real Owner
  const ownerEmail = env.SEED_OWNER_EMAIL || 'admin@crewdesk.agency';
  const ownerPassword = env.SEED_OWNER_PASSWORD || 'CrewDeskAdmin2026!';
  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await prisma.user.upsert({
    where: { email: ownerEmail.toLowerCase() },
    update: {
      name: 'Bilal Arshad',
      role: 'OWNER',
      title: 'Managing Director & Agency Owner',
      isActive: true,
      isDemo: false,
    },
    create: {
      name: 'Bilal Arshad',
      email: ownerEmail.toLowerCase(),
      passwordHash,
      role: 'OWNER',
      title: 'Managing Director & Agency Owner',
      mustChangePassword: false,
      isActive: true,
      isDemo: false,
    },
  });

  console.log('Initial seed completed successfully.');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
