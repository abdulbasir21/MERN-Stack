import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { prisma, ensureDatabaseConnected } from '../../src/db/prisma.js';
import { env } from '../../src/config/env.js';
import { AppError } from '../../src/lib/errors.js';
import { resetAllRateLimits } from '../../src/middleware/rateLimit.js';
import { seedDatabase } from '../../prisma/seed.js';
import {
  getGlobalBudgetSnapshot,
  ProviderCallError,
  withAiUsage,
} from '../../src/services/quota/quotaEngine.js';

const CSRF_HEADER = { 'X-Requested-With': 'InterviewPilot' };

describe('Phase 3 (b) — Quota and AI Budget Engine Database & Concurrency (QTA-1..8, QTA-10, QTA-13, QTA-15)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });

  beforeAll(async () => {
    await ensureDatabaseConnected();
    await seedDatabase(prisma);
  });

  beforeEach(async () => {
    resetAllRateLimits();
    await prisma.$transaction([
      prisma.aIUsageRecord.deleteMany({}),
      prisma.usageCounter.deleteMany({}),
      prisma.userQuota.deleteMany({}),
      prisma.passwordResetToken.deleteMany({}),
      prisma.userProfile.deleteMany({}),
      prisma.user.deleteMany({ where: { role: 'USER' } }),
      prisma.applicationSetting.updateMany({
        where: { key: 'aiEnabled' },
        data: { value: true },
      }),
      prisma.applicationSetting.updateMany({
        where: { key: 'globalMonthlyRequestCap' },
        data: { value: 10000 },
      }),
    ]);
  });

  it('QTA-1, QTA-4 & QTA-8: enforces strict 10-step check order; blocked user never reaches quota step; aiEnabled=false and unpriced model block immediately with 0 AI calls', async () => {
    let providerCalls = 0;
    const mockProvider = async () => {
      providerCalls += 1;
      return { result: 'ok', inputTokens: 100, outputTokens: 50 };
    };

    // Step 1: Anonymous / missing actorUserId -> 401 UNAUTHENTICATED
    await expect(
      withAiUsage(
        {
          actorUserId: null,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
        },
        mockProvider
      )
    ).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });
    expect(providerCalls).toBe(0);

    // Step 2: Blocked user -> 403 ACCOUNT_BLOCKED, and never touches UsageCounter
    const blockedUser = await prisma.user.create({
      data: {
        email: 'blocked-qta@example.com',
        role: 'USER',
        status: 'BLOCKED',
      },
    });

    await expect(
      withAiUsage(
        {
          actorUserId: blockedUser.id,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
        },
        mockProvider
      )
    ).rejects.toMatchObject({
      code: 'ACCOUNT_BLOCKED',
      statusCode: 403,
    });
    expect(providerCalls).toBe(0);
    const countersAfterBlocked = await prisma.usageCounter.count();
    expect(countersAfterBlocked).toBe(0);

    // Create active user for Steps 3..8
    const activeUser = await prisma.user.create({
      data: {
        email: 'active-qta@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // Step 3: Demo user has documentAnalysesPerDay = 0 -> 429 USER_QUOTA_EXCEEDED
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo-qta@example.com',
        role: 'USER',
        status: 'ACTIVE',
        isDemo: true,
      },
    });
    await expect(
      withAiUsage(
        {
          actorUserId: demoUser.id,
          operation: 'DOCUMENT_SUMMARY',
          model: env.GEMINI_TEXT_MODEL,
        },
        mockProvider
      )
    ).rejects.toMatchObject({
      code: 'USER_QUOTA_EXCEEDED',
      statusCode: 429,
    });
    expect(providerCalls).toBe(0);

    // Step 4: Interview quota check fails before global budget / provider call -> 422
    await expect(
      withAiUsage(
        {
          actorUserId: activeUser.id,
          operation: 'CANDIDATE_INQUIRY',
          model: env.GEMINI_TEXT_MODEL,
          interviewQuotaCheck: {
            allowed: false,
            errorCode: 'INQUIRY_LIMIT_REACHED',
            message: 'Maximum inquiries reached for this interview.',
          },
        },
        mockProvider
      )
    ).rejects.toMatchObject({
      code: 'INQUIRY_LIMIT_REACHED',
      statusCode: 422,
    });
    expect(providerCalls).toBe(0);

    // Step 6a: aiEnabled = false blocks immediately -> 503 AI_DISABLED
    await prisma.applicationSetting.update({
      where: { key: 'aiEnabled' },
      data: { value: false },
    });

    await expect(
      withAiUsage(
        {
          actorUserId: activeUser.id,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
        },
        mockProvider
      )
    ).rejects.toMatchObject({
      code: 'AI_DISABLED',
      statusCode: 503,
    });
    expect(providerCalls).toBe(0);

    // Re-enable AI
    await prisma.applicationSetting.update({
      where: { key: 'aiEnabled' },
      data: { value: true },
    });

    // Step 6b (QTA-8): Model without price entry is blocked -> 503 AI_UNAVAILABLE
    await expect(
      withAiUsage(
        {
          actorUserId: activeUser.id,
          operation: 'ANSWER_EVALUATION',
          model: 'unconfigured-paid-model-v1',
        },
        mockProvider
      )
    ).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
      statusCode: 503,
    });
    expect(providerCalls).toBe(0);

    // Step 6c (QTA-8): Free-tier model with explicit price 0 succeeds
    const okRes = await withAiUsage(
      {
        actorUserId: activeUser.id,
        operation: 'ANSWER_EVALUATION',
        model: env.GEMINI_TEXT_MODEL,
      },
      mockProvider
    );
    expect(okRes).toBe('ok');
    expect(providerCalls).toBe(1);
  });

  it('QTA-2: 20 parallel requests against a limit of 5 -> exactly 5 succeed and 15 are denied', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'parallel@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    let providerExecutions = 0;

    const tasks = Array.from({ length: 20 }, (_, idx) =>
      withAiUsage(
        {
          actorUserId: user.id,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
          userDailyRequestCap: 5,
        },
        async () => {
          providerExecutions += 1;
          await new Promise((r) => setTimeout(r, 20));
          return {
            result: `success-${idx}`,
            inputTokens: 100,
            outputTokens: 100,
          };
        }
      ).then(
        (val) => ({ status: 'fulfilled' as const, value: val }),
        (err: unknown) => ({ status: 'rejected' as const, reason: err })
      )
    );

    const outcomes = await Promise.all(tasks);
    const succeeded = outcomes.filter((o) => o.status === 'fulfilled');
    const denied = outcomes.filter((o) => o.status === 'rejected');

    expect(succeeded.length).toBe(5);
    expect(denied.length).toBe(15);
    expect(providerExecutions).toBe(5);

    for (const d of denied) {
      expect(d.reason).toBeInstanceOf(AppError);
      expect((d.reason as AppError).code).toBe('USER_QUOTA_EXCEEDED');
    }

    const userCounter = await prisma.usageCounter.findFirst({
      where: { scopeType: 'USER', scopeId: user.id },
    });
    expect(userCounter?.requestsUsed).toBe(5);
    expect(userCounter?.requestsReserved).toBe(0);
  });

  it('QTA-3: fails closed (503 AI_UNAVAILABLE) and makes 0 AI calls when counter update throws', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'failclosed@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    let aiCalled = false;
    await expect(
      withAiUsage(
        {
          actorUserId: user.id,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
          simulateCounterUpdateFailure: true,
        },
        async () => {
          aiCalled = true;
          return { result: 'should-not-run' };
        }
      )
    ).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
      statusCode: 503,
    });

    expect(aiCalled).toBe(false);
  });

  it('QTA-6: failed provider call counts 1 request and releases tokens; expired reservations are lazily released at next check', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'settlement@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // 1. Provider call fails after reaching provider -> counts 1 request, releases tokens
    await expect(
      withAiUsage(
        {
          actorUserId: user.id,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
          estimatedInputTokens: 600,
          estimatedOutputTokens: 400,
        },
        async () => {
          throw new ProviderCallError('Gemini 500 error', true);
        }
      )
    ).rejects.toThrow('Gemini 500 error');

    const failedRecord = await prisma.aIUsageRecord.findFirst({
      where: { userId: user.id },
    });
    expect(failedRecord?.status).toBe('FAILED');
    expect(failedRecord?.actualRequests).toBe(1);
    expect(failedRecord?.actualTokens).toBe(0);

    const counterAfterFail = await prisma.usageCounter.findFirst({
      where: { scopeType: 'USER', scopeId: user.id },
    });
    expect(counterAfterFail?.requestsUsed).toBe(1);
    expect(counterAfterFail?.requestsReserved).toBe(0);
    expect(counterAfterFail?.tokensUsed).toBe(0);
    expect(counterAfterFail?.tokensReserved).toBe(0);

    // 2. Insert a stale RESERVED record (10 minutes old, TTL = 300s) and verify lazy expiry releases it
    const now = new Date('2026-11-10T12:00:00.000Z');
    const tenMinAgo = new Date('2026-11-10T11:50:00.000Z');
    const dayStart = new Date('2026-11-10T00:00:00.000Z');
    const monthStart = new Date('2026-11-01T00:00:00.000Z');

    await prisma.usageCounter.upsert({
      where: {
        scopeType_scopeId_periodType_periodStart: {
          scopeType: 'USER',
          scopeId: user.id,
          periodType: 'DAY',
          periodStart: dayStart,
        },
      },
      create: {
        scopeType: 'USER',
        scopeId: user.id,
        periodType: 'DAY',
        periodStart: dayStart,
        requestsReserved: 1,
        tokensReserved: 1500,
        documentAnalysesReserved: 1,
      },
      update: {
        requestsReserved: 1,
        tokensReserved: 1500,
        documentAnalysesReserved: 1,
      },
    });

    const staleReservation = await prisma.aIUsageRecord.create({
      data: {
        userId: user.id,
        operation: 'DOCUMENT_SUMMARY',
        model: env.GEMINI_TEXT_MODEL,
        status: 'RESERVED',
        reservedRequests: 1,
        reservedTokens: 1500,
        reservedCost: new Prisma.Decimal(0),
        periodDayStart: dayStart,
        periodMonthStart: monthStart,
        createdAt: tenMinAgo,
      },
    });

    // Next quota check at `now` lazily expires staleReservation
    await withAiUsage(
      {
        actorUserId: user.id,
        operation: 'ANSWER_EVALUATION',
        model: env.GEMINI_TEXT_MODEL,
        now,
      },
      async () => ({ result: 'ok', inputTokens: 100, outputTokens: 100 })
    );

    const refreshedStale = await prisma.aIUsageRecord.findUnique({
      where: { id: staleReservation.id },
    });
    expect(refreshedStale?.status).toBe('EXPIRED');

    const refreshedCounter = await prisma.usageCounter.findUnique({
      where: {
        scopeType_scopeId_periodType_periodStart: {
          scopeType: 'USER',
          scopeId: user.id,
          periodType: 'DAY',
          periodStart: dayStart,
        },
      },
    });
    expect(refreshedCounter?.requestsReserved).toBe(0);
    expect(refreshedCounter?.tokensReserved).toBe(0);
    expect(refreshedCounter?.documentAnalysesReserved).toBe(0);
  });

  it('QTA-5, QTA-7, QTA-10 & QTA-15: UTC day rollover resets daily quota, per-user override beats profile default, and warning flag turns on at threshold', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'rollover@example.com',
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    const day1 = new Date('2026-11-10T23:59:50.000Z');
    const day2 = new Date('2026-11-11T00:00:05.000Z');

    // FREE_USER default documentAnalysesPerDay = 2. Run 2 on day1 -> both pass
    await withAiUsage(
      {
        actorUserId: user.id,
        operation: 'DOCUMENT_SUMMARY',
        model: env.GEMINI_TEXT_MODEL,
        now: day1,
      },
      async () => ({ result: 'doc1', inputTokens: 100, outputTokens: 50 })
    );
    await withAiUsage(
      {
        actorUserId: user.id,
        operation: 'DOCUMENT_SUMMARY',
        model: env.GEMINI_TEXT_MODEL,
        now: day1,
      },
      async () => ({ result: 'doc2', inputTokens: 100, outputTokens: 50 })
    );

    // 3rd on day1 -> denied
    await expect(
      withAiUsage(
        {
          actorUserId: user.id,
          operation: 'DOCUMENT_SUMMARY',
          model: env.GEMINI_TEXT_MODEL,
          now: day1,
        },
        async () => ({ result: 'doc3' })
      )
    ).rejects.toMatchObject({ code: 'USER_QUOTA_EXCEEDED', statusCode: 429 });

    // QTA-15: Add per-user override raising documentAnalysesPerDay to 3 -> 3rd on day1 now succeeds!
    await prisma.userQuota.create({
      data: {
        userId: user.id,
        documentAnalysesPerDay: 3,
      },
    });

    const thirdWithOverride = await withAiUsage(
      {
        actorUserId: user.id,
        operation: 'DOCUMENT_SUMMARY',
        model: env.GEMINI_TEXT_MODEL,
        now: day1,
      },
      async () => ({ result: 'doc3-override', inputTokens: 100, outputTokens: 50 })
    );
    expect(thirdWithOverride).toBe('doc3-override');

    // 4th on day1 -> denied even with override=3
    await expect(
      withAiUsage(
        {
          actorUserId: user.id,
          operation: 'DOCUMENT_SUMMARY',
          model: env.GEMINI_TEXT_MODEL,
          now: day1,
        },
        async () => ({ result: 'doc4' })
      )
    ).rejects.toMatchObject({ code: 'USER_QUOTA_EXCEEDED', statusCode: 429 });

    // QTA-5: Rollover to day2 (15 seconds later in UTC) -> succeeds!
    const day2Res = await withAiUsage(
      {
        actorUserId: user.id,
        operation: 'DOCUMENT_SUMMARY',
        model: env.GEMINI_TEXT_MODEL,
        now: day2,
      },
      async () => ({ result: 'day2-doc1', inputTokens: 100, outputTokens: 50 })
    );
    expect(day2Res).toBe('day2-doc1');

    // QTA-10 & QTA-7: Set globalMonthlyRequestCap = 5. We have used 4 requests in Nov 2026 (4/5 = 80% >= 0.80 warningThreshold)
    await prisma.applicationSetting.update({
      where: { key: 'globalMonthlyRequestCap' },
      data: { value: 5 },
    });

    const snapshotAt80 = await getGlobalBudgetSnapshot(day2, prisma);
    expect(snapshotAt80.requestsUsed).toBe(4);
    expect(snapshotAt80.requestWarning).toBe(true);

    // 5th request in month succeeds
    await withAiUsage(
      {
        actorUserId: user.id,
        operation: 'ANSWER_EVALUATION',
        model: env.GEMINI_TEXT_MODEL,
        now: day2,
      },
      async () => ({ result: 'req5', inputTokens: 50, outputTokens: 50 })
    );

    // 6th request in month -> 503 GLOBAL_BUDGET_EXHAUSTED
    await expect(
      withAiUsage(
        {
          actorUserId: user.id,
          operation: 'ANSWER_EVALUATION',
          model: env.GEMINI_TEXT_MODEL,
          now: day2,
        },
        async () => ({ result: 'req6' })
      )
    ).rejects.toMatchObject({
      code: 'GLOBAL_BUDGET_EXHAUSTED',
      statusCode: 503,
    });
  });

  it('QTA-13: enforces 20 AI requests/minute/user rate limit on AI endpoints and returns quota snapshot on /api/quota/me', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF_HEADER)
      .send({
        email: 'ratelimit-ai@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const rawSetCookie = regRes.headers['set-cookie'];
    const cookieList = Array.isArray(rawSetCookie) ? rawSetCookie : [String(rawSetCookie || '')];
    const cookie = cookieList.find((c) => c.startsWith('ip_session='))?.split(';')[0] || '';

    const quotaMeRes = await request(app)
      .get('/api/quota/me')
      .set('Cookie', cookie);
    expect(quotaMeRes.status).toBe(200);
    expect(quotaMeRes.body.data.limits.interviewsPerDay).toBe(2);

    // 20 requests to /api/quota/dev-simulate succeed (run in 4 batches of 5)
    for (let batch = 0; batch < 4; batch++) {
      const batchRes = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app)
            .post('/api/quota/dev-simulate')
            .set(CSRF_HEADER)
            .set('Cookie', cookie)
            .send({ operation: 'ANSWER_EVALUATION' })
        )
      );
      for (const r of batchRes) {
        expect(r.status).toBe(200);
      }
    }

    // 21st request in same minute -> 429 RATE_LIMITED
    const limitedRes = await request(app)
      .post('/api/quota/dev-simulate')
      .set(CSRF_HEADER)
      .set('Cookie', cookie)
      .send({ operation: 'ANSWER_EVALUATION' });
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body.error.code).toBe('RATE_LIMITED');
  });
});
