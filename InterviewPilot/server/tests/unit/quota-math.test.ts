import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  getUtcDayStart,
  getUtcMonthStart,
  isSameUtcDay,
  isSameUtcMonth,
  resolveEffectiveUserQuota,
  computeEffectiveInterviewLimits,
  validateModelPriceEntry,
  estimateAiCostUsd,
  canReserveCounter,
  computeRemainingBudget,
  calculateUsageWarningFlag,
  computeSettlementDelta,
  isReservationExpired,
  buildIdempotencyKey,
  type QuotaProfileLimits,
} from '../../src/lib/quotaMath.js';

const FREE_DEFAULTS: QuotaProfileLimits = {
  interviewsPerDay: 2,
  maxDurationMinutes: 15,
  maxQuestionsPerInterview: 10,
  maxInquiriesPerInterview: 3,
  documentAnalysesPerDay: 2,
  reportGenerationsPerDay: 2,
  concurrentActiveInterviews: 1,
};

describe('Phase 3 (a) — Quota & AI Budget Pure Math (QTA-5..10, QTA-12, QTA-15)', () => {
  it('QTA-5: calculates UTC day and month start and detects UTC rollover accurately', () => {
    const beforeMidnight = new Date('2026-11-10T23:59:59.999Z');
    const afterMidnight = new Date('2026-11-11T00:00:00.000Z');

    expect(getUtcDayStart(beforeMidnight).toISOString()).toBe('2026-11-10T00:00:00.000Z');
    expect(getUtcDayStart(afterMidnight).toISOString()).toBe('2026-11-11T00:00:00.000Z');
    expect(isSameUtcDay(beforeMidnight, afterMidnight)).toBe(false);
    expect(isSameUtcMonth(beforeMidnight, afterMidnight)).toBe(true);

    const nextMonth = new Date('2026-12-01T00:00:00.000Z');
    expect(getUtcMonthStart(beforeMidnight).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(getUtcMonthStart(nextMonth).toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(isSameUtcMonth(beforeMidnight, nextMonth)).toBe(false);
  });

  it('QTA-15: per-user quota overrides beat profile defaults while null/undefined keep defaults', () => {
    const effective = resolveEffectiveUserQuota(FREE_DEFAULTS, {
      interviewsPerDay: 5,
      maxDurationMinutes: 30,
      documentAnalysesPerDay: null,
    });

    expect(effective).toEqual({
      ...FREE_DEFAULTS,
      interviewsPerDay: 5,
      maxDurationMinutes: 30,
      documentAnalysesPerDay: 2,
    });
  });

  it('QTA-9 & SET-3: computes effective interview limits and rejects exceeding selections with allowed values', () => {
    // Default questionCount = floor(15 / 3) = 5
    const okDefault = computeEffectiveInterviewLimits({ durationMinutes: 15 }, FREE_DEFAULTS);
    expect(okDefault).toEqual({
      ok: true,
      durationMinutes: 15,
      maxQuestions: 5,
    });

    // Selecting 45 minutes on a 15-minute limit -> rejected with allowedValues [15]
    const overDuration = computeEffectiveInterviewLimits(
      { durationMinutes: 45 },
      FREE_DEFAULTS
    );
    expect(overDuration).toEqual({
      ok: false,
      field: 'durationMinutes',
      allowedMax: 15,
      allowedValues: [15],
    });

    // Selecting 12 questions on a 10-question limit -> rejected
    const overQuestions = computeEffectiveInterviewLimits(
      { durationMinutes: 15, questionCount: 12 },
      FREE_DEFAULTS
    );
    expect(overQuestions.ok).toBe(false);
    if (!overQuestions.ok) {
      expect(overQuestions.field).toBe('questionCount');
      expect(overQuestions.allowedMax).toBe(10);
      expect(overQuestions.allowedValues).toContain(10);
    }
  });

  it('QTA-8 & Decimal math: blocks unpriced models, allows explicit 0 price, and has zero float drift', () => {
    const prices = {
      'gemini-3.5-flash-lite': { inputUsdPerMillion: '0', outputUsdPerMillion: '0' },
      'custom-priced-model': { inputUsdPerMillion: '0.1', outputUsdPerMillion: '0.2' },
    };

    const unpriced = validateModelPriceEntry('unknown-model', prices);
    expect(unpriced).toEqual({ valid: false, reason: 'MODEL_PRICE_MISSING' });

    const freeModel = validateModelPriceEntry('gemini-3.5-flash-lite', prices);
    expect(freeModel.valid).toBe(true);

    const freeCost = estimateAiCostUsd({
      inputTokens: 50_000,
      outputTokens: 25_000,
      price: prices['gemini-3.5-flash-lite'],
    });
    expect(freeCost.toFixed(6)).toBe('0.000000');

    // Verify exact Decimal arithmetic without JS 0.1 + 0.2 = 0.30000000000000004 drift
    const exactCost = estimateAiCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      price: prices['custom-priced-model'],
    });
    expect(exactCost.toString()).toBe('0.3');

    const remaining = computeRemainingBudget('10.00', '3.10', '0.20');
    expect(remaining.toFixed(2)).toBe('6.70');
  });

  it('QTA-2 & QTA-10: reservation check math and warning threshold flag calculation', () => {
    const checkOk = canReserveCounter(
      {
        requestsUsed: 3,
        requestsReserved: 1,
        tokensUsed: 1000,
        tokensReserved: 500,
        costUsed: '1.00',
        costReserved: '0.50',
      },
      { requests: 1, tokens: 500, cost: '0.50' },
      { maxRequests: 5, maxTokens: 5000, maxCostUsd: '5.00' }
    );
    expect(checkOk).toEqual({ allowed: true });

    const checkDenied = canReserveCounter(
      {
        requestsUsed: 4,
        requestsReserved: 1,
        tokensUsed: 1000,
        tokensReserved: 500,
        costUsed: '1.00',
      },
      { requests: 1, tokens: 100, cost: '0' },
      { maxRequests: 5, maxTokens: 5000, maxCostUsd: '5.00' }
    );
    expect(checkDenied).toEqual({ allowed: false, reason: 'REQUEST_CAP_EXCEEDED' });

    // QTA-10: Warning flag turns on at exact 80% threshold (80 / 100 >= 0.80)
    expect(calculateUsageWarningFlag(79, 100, '0.80')).toBe(false);
    expect(calculateUsageWarningFlag(80, 100, '0.80')).toBe(true);
    expect(calculateUsageWarningFlag('8.00', '10.00', '0.80')).toBe(true);
  });

  it('QTA-6 & QTA-12: settlement delta handles provider tokens, fallback estimate, provider failure (1 request + release tokens), expiry, and idempotency keys', () => {
    const reservation = {
      reservedRequests: 1,
      reservedTokens: 2000,
      reservedCost: new Prisma.Decimal('0.002000'),
    };
    const price = { inputUsdPerMillion: '1.00', outputUsdPerMillion: '1.00' };

    // Settled with actual provider tokens
    const settledActual = computeSettlementDelta(reservation, {
      status: 'SUCCEEDED',
      actualInputTokens: 500,
      actualOutputTokens: 300,
      price,
    });
    expect(settledActual.finalStatus).toBe('SETTLED');
    expect(settledActual.actualRequests).toBe(1);
    expect(settledActual.actualTokens).toBe(800);
    expect(settledActual.actualCost.toFixed(6)).toBe('0.000800');
    expect(settledActual.releaseTokens).toBe(2000);

    // Settled when provider omits token counts -> uses reserved estimate
    const settledFallback = computeSettlementDelta(reservation, {
      status: 'SUCCEEDED',
      actualInputTokens: null,
      actualOutputTokens: null,
      price,
    });
    expect(settledFallback.actualTokens).toBe(2000);
    expect(settledFallback.actualCost.toFixed(6)).toBe('0.002000');

    // Failed after reaching provider -> counts 1 request, releases tokens
    const failedProvider = computeSettlementDelta(reservation, {
      status: 'PROVIDER_FAILED',
      price,
    });
    expect(failedProvider.finalStatus).toBe('FAILED');
    expect(failedProvider.actualRequests).toBe(1);
    expect(failedProvider.actualTokens).toBe(0);
    expect(failedProvider.actualCost.toFixed(6)).toBe('0.000000');
    expect(failedProvider.releaseTokens).toBe(2000);

    // Expired reservation -> counts 0 requests, releases all
    const expired = computeSettlementDelta(reservation, {
      status: 'EXPIRED',
      price,
    });
    expect(expired.finalStatus).toBe('EXPIRED');
    expect(expired.actualRequests).toBe(0);
    expect(expired.actualTokens).toBe(0);

    const t0 = new Date('2026-11-10T10:00:00.000Z');
    expect(isReservationExpired(t0, new Date('2026-11-10T10:04:59.000Z'), 300)).toBe(false);
    expect(isReservationExpired(t0, new Date('2026-11-10T10:05:00.000Z'), 300)).toBe(true);

    const idemKey = buildIdempotencyKey({
      userId: 'u1',
      interviewId: 'i1',
      operation: 'ANSWER',
      clientRequestId: ' req-123 ',
    });
    expect(idemKey).toBe('u1:i1:ANSWER:req-123');
  });
});
