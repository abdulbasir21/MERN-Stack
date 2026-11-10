import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../src/db/prisma.js';
import { env } from '../src/config/env.js';
import { BCRYPT_COST } from '../src/config/constants.js';

export interface SeedOptions {
  adminEmail?: string;
  defaultAdminPassword?: string;
}

/**
 * Seed script for quota profiles (M3 defaults) and the first ADMIN from ADMIN_BOOTSTRAP_EMAIL (AUTH-7).
 * No API endpoint can ever grant the ADMIN role; only this seed function can.
 */
export async function seedDatabase(
  db: PrismaClient = defaultPrisma,
  options: SeedOptions = {}
): Promise<{ adminEmail: string }> {
  const adminEmail = (options.adminEmail || env.ADMIN_BOOTSTRAP_EMAIL)
    .trim()
    .toLowerCase();

  // M3 QuotaConfiguration defaults for DEMO and FREE_USER
  await db.quotaConfiguration.upsert({
    where: { profile: 'DEMO' },
    create: {
      profile: 'DEMO',
      interviewsPerDay: 1,
      maxDurationMinutes: 5,
      maxQuestionsPerInterview: 3,
      maxInquiriesPerInterview: 1,
      documentAnalysesPerDay: 0,
      reportGenerationsPerDay: 1,
      concurrentActiveInterviews: 1,
    },
    update: {
      interviewsPerDay: 1,
      maxDurationMinutes: 5,
      maxQuestionsPerInterview: 3,
      maxInquiriesPerInterview: 1,
      documentAnalysesPerDay: 0,
      reportGenerationsPerDay: 1,
      concurrentActiveInterviews: 1,
    },
  });

  await db.quotaConfiguration.upsert({
    where: { profile: 'FREE_USER' },
    create: {
      profile: 'FREE_USER',
      interviewsPerDay: 2,
      maxDurationMinutes: 15,
      maxQuestionsPerInterview: 10,
      maxInquiriesPerInterview: 3,
      documentAnalysesPerDay: 2,
      reportGenerationsPerDay: 2,
      concurrentActiveInterviews: 1,
    },
    update: {
      interviewsPerDay: 2,
      maxDurationMinutes: 15,
      maxQuestionsPerInterview: 10,
      maxInquiriesPerInterview: 3,
      documentAnalysesPerDay: 2,
      reportGenerationsPerDay: 2,
      concurrentActiveInterviews: 1,
    },
  });

  // AUTH-7: Bootstrap first ADMIN from ADMIN_BOOTSTRAP_EMAIL
  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    if (existingAdmin.role !== 'ADMIN') {
      await db.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN', status: 'ACTIVE', isDemo: false },
      });
    }
  } else {
    const initialPassword = options.defaultAdminPassword || 'AdminBootstrap123!';
    const passwordHash = await bcrypt.hash(initialPassword, BCRYPT_COST);
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        isDemo: false,
        tokenVersion: 0,
        profile: {
          create: {
            fullName: 'Platform Administrator',
            preferredCategories: ['TECHNICAL', 'HR', 'BEHAVIORAL'],
            onboardingCompletedAt: new Date(),
          },
        },
      },
    });
  }

  return { adminEmail };
}

// Run when invoked directly via `tsx prisma/seed.ts`
const isDirectRun =
  process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('prisma/seed.ts');

if (isDirectRun) {
  seedDatabase()
    .then(() => {
      console.info('[SEED] Database seeded successfully.');
      return defaultPrisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('[SEED] Failed to seed database:', err instanceof Error ? err.message : 'Unknown error');
      await defaultPrisma.$disconnect();
      process.exit(1);
    });
}
