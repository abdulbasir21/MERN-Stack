import crypto from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { signSessionToken } from '../../middleware/auth.js';

/**
 * DEM-3: Hash client IP with HMAC SHA-256 using DEMO_IP_HASH_SECRET.
 * Strictly guarantees that no raw IP addresses are stored.
 */
export function hashClientIp(ip: string): string {
  const normalized = ip.trim().toLowerCase();
  return crypto.createHmac('sha256', env.DEMO_IP_HASH_SECRET).update(normalized).digest('hex');
}

/**
 * DEM-7: Lazily purge up to 50 expired demo users per demo session creation.
 * No cron jobs required.
 */
export async function purgeExpiredDemoUsers(limit = 50): Promise<number> {
  const now = new Date();
  const expiredSessions = await prisma.demoSession.findMany({
    where: { expiresAt: { lt: now } },
    select: { userId: true },
    take: limit,
  });

  if (expiredSessions.length === 0) return 0;

  const userIds = expiredSessions.map((s) => s.userId);

  // Cascade deletes demoSession, userProfile, and any demo interviews/records
  const deleted = await prisma.user.deleteMany({
    where: {
      id: { in: userIds },
      isDemo: true,
    },
  });

  return deleted.count;
}

export interface DemoSessionResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    isDemo: boolean;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
}

/**
 * DEM-1: Create an isolated ephemeral demo user and session.
 * Enforces demoEnabled check, lazy cleanup, and IP / global rate limits (DEM-1..3, DEM-7).
 */
export async function createDemoSession(clientIp: string): Promise<DemoSessionResult> {
  // 1. DEM-2: Check if demo feature is enabled globally
  const demoSetting = await prisma.applicationSetting.findUnique({
    where: { key: 'demoEnabled' },
  });
  if (demoSetting && demoSetting.value === false) {
    throw new AppError('DEMO_DISABLED', 'The demo experience is currently disabled.', 503);
  }

  // 2. DEM-7: Lazy purge of expired demo users
  await purgeExpiredDemoUsers(50);

  // 3. DEM-3: Check IP hash limits and Global daily limits
  const ipHash = hashClientIp(clientIp || '127.0.0.1');

  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  // Load configured limits or defaults
  const ipLimitSetting = await prisma.applicationSetting.findUnique({
    where: { key: 'demoInterviewsPerIpPerDay' },
  });
  const maxPerIp = typeof ipLimitSetting?.value === 'number' ? ipLimitSetting.value : 1;

  const globalLimitSetting = await prisma.applicationSetting.findUnique({
    where: { key: 'demoGlobalInterviewsPerDay' },
  });
  const maxGlobal = typeof globalLimitSetting?.value === 'number' ? globalLimitSetting.value : 20;

  // Check IP session count today
  const ipCountToday = await prisma.demoSession.count({
    where: {
      ipHash,
      createdAt: { gte: startOfTodayUtc },
    },
  });

  if (ipCountToday >= maxPerIp) {
    throw new AppError(
      'DEMO_RESTRICTED',
      'Daily demo limit reached for your connection. Please register for a free account to continue.',
      429
    );
  }

  // Check global demo count today
  const globalCountToday = await prisma.demoSession.count({
    where: {
      createdAt: { gte: startOfTodayUtc },
    },
  });

  if (globalCountToday >= maxGlobal) {
    throw new AppError(
      'DEMO_RESTRICTED',
      'Global demo capacity reached for today. Please register or try again tomorrow.',
      429
    );
  }

  // 4. Create ephemeral User + Profile + DemoSession in ONE transaction
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
  const ephemeralEmail = `demo-${crypto.randomUUID()}@demo.interviewpilot.local`;

  const { user, session } = await prisma.$transaction(
    async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: ephemeralEmail,
          role: 'USER',
          isDemo: true,
          profile: {
            create: {
              fullName: 'Demo Candidate',
              onboardingCompletedAt: new Date(),
            },
          },
        },
      });

      const newSession = await tx.demoSession.create({
        data: {
          userId: newUser.id,
          ipHash,
          expiresAt,
        },
      });

      return { user: newUser, session: newSession };
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  // Generate JWT token
  const token = signSessionToken({
    userId: user.id,
    tokenVersion: user.tokenVersion,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isDemo: user.isDemo,
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
  };
}

/**
 * DEM-5: Read-only sample fixtures (labelled "Sample data", zero DB writes).
 */
export function getSampleDemoFixtures() {
  return {
    label: 'Sample data — read-only demo preview',
    isSample: true,
    sampleInterview: {
      id: 'sample-inv-01',
      role: 'Staff Frontend Engineer',
      type: 'TECHNICAL',
      date: '2026-11-10T14:30:00Z',
      durationSeconds: 920,
      overallScore: 88,
      status: 'COMPLETED',
    },
    sampleReport: {
      summary: 'Candidate demonstrated exemplary technical architecture vision and clear cross-functional storytelling.',
      strengths: [
        'Robust mental model of distributed caching and cache-invalidation semantics',
        'Strong situational framing using STAR methodology',
      ],
      weaknesses: [
        'Could provide deeper quantitative evidence in system capacity planning',
      ],
      recommendations: [
        'Practice estimating Redis memory footprints and network throughput limits',
      ],
      studyTopics: [
        'Distributed Caching & Redis Patterns',
      ],
    },
    statistics: {
      totalInterviews: 4,
      completedInterviews: 4,
      averageScore: 84,
      recentTrend: [72, 78, 85, 88],
      targetRole: 'Staff Frontend Engineer',
    },
    recentInterviews: [
      {
        id: 'sample-inv-01',
        role: 'Staff Frontend Engineer',
        type: 'TECHNICAL',
        date: '2026-11-10T14:30:00Z',
        durationSeconds: 920,
        overallScore: 88,
        status: 'COMPLETED',
      },
      {
        id: 'sample-inv-02',
        role: 'Full Stack Engineer (Node/React)',
        type: 'TECHNICAL',
        date: '2026-11-08T10:15:00Z',
        durationSeconds: 900,
        overallScore: 85,
        status: 'COMPLETED',
      },
      {
        id: 'sample-inv-03',
        role: 'Engineering Manager',
        type: 'BEHAVIORAL',
        date: '2026-11-05T16:00:00Z',
        durationSeconds: 1100,
        overallScore: 78,
        status: 'COMPLETED',
      },
    ],
    latestReport: {
      summary: 'Candidate demonstrated exemplary technical architecture vision and clear cross-functional storytelling.',
      strengths: [
        'Robust mental model of distributed caching and cache-invalidation semantics',
        'Strong situational framing using STAR methodology',
        'Proactive edge-case identification in real-time streaming architectures',
      ],
      weaknesses: [
        'Could provide deeper quantitative evidence in system capacity planning',
      ],
      recommendations: [
        'Practice estimating Redis memory footprints and network throughput limits',
      ],
      studyTopics: [
        'Distributed Caching & Redis Patterns',
        'Web Audio API Low-Latency Buffers',
      ],
    },
  };
}
