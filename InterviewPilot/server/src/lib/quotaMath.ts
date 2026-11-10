import { Prisma } from '@prisma/client';

export interface QuotaProfileLimits {
  interviewsPerDay: number;
  maxDurationMinutes: number;
  maxQuestionsPerInterview: number;
  maxInquiriesPerInterview: number;
  documentAnalysesPerDay: number;
  reportGenerationsPerDay: number;
  concurrentActiveInterviews: number;
}

export interface UserQuotaOverrides {
  interviewsPerDay?: number | null;
  maxDurationMinutes?: number | null;
  maxQuestionsPerInterview?: number | null;
  maxInquiriesPerInterview?: number | null;
  documentAnalysesPerDay?: number | null;
  reportGenerationsPerDay?: number | null;
  concurrentActiveInterviews?: number | null;
}

export interface ModelPriceEntry {
  inputUsdPerMillion: string | number | Prisma.Decimal;
  outputUsdPerMillion: string | number | Prisma.Decimal;
}

export const ALLOWED_DURATION_OPTIONS = [15, 30, 45] as const;
export const DEMO_ALLOWED_DURATION_OPTIONS = [5, 15, 30, 45] as const;

/**
 * QTA-5: Returns the UTC start of the calendar day (00:00:00.000Z).
 */
export function getUtcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

/**
 * QTA-5: Returns the UTC start of the calendar month (1st at 00:00:00.000Z).
 */
export function getUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return getUtcDayStart(a).getTime() === getUtcDayStart(b).getTime();
}

export function isSameUtcMonth(a: Date, b: Date): boolean {
  return getUtcMonthStart(a).getTime() === getUtcMonthStart(b).getTime();
}

/**
 * QTA-15: Per-user non-null override fields beat profile defaults.
 */
export function resolveEffectiveUserQuota(
  profileDefaults: QuotaProfileLimits,
  userOverride?: UserQuotaOverrides | null
): QuotaProfileLimits {
  if (!userOverride) {
    return { ...profileDefaults };
  }

  return {
    interviewsPerDay:
      userOverride.interviewsPerDay !== null && userOverride.interviewsPerDay !== undefined
        ? userOverride.interviewsPerDay
        : profileDefaults.interviewsPerDay,
    maxDurationMinutes:
      userOverride.maxDurationMinutes !== null && userOverride.maxDurationMinutes !== undefined
        ? userOverride.maxDurationMinutes
        : profileDefaults.maxDurationMinutes,
    maxQuestionsPerInterview:
      userOverride.maxQuestionsPerInterview !== null &&
      userOverride.maxQuestionsPerInterview !== undefined
        ? userOverride.maxQuestionsPerInterview
        : profileDefaults.maxQuestionsPerInterview,
    maxInquiriesPerInterview:
      userOverride.maxInquiriesPerInterview !== null &&
      userOverride.maxInquiriesPerInterview !== undefined
        ? userOverride.maxInquiriesPerInterview
        : profileDefaults.maxInquiriesPerInterview,
    documentAnalysesPerDay:
      userOverride.documentAnalysesPerDay !== null &&
      userOverride.documentAnalysesPerDay !== undefined
        ? userOverride.documentAnalysesPerDay
        : profileDefaults.documentAnalysesPerDay,
    reportGenerationsPerDay:
      userOverride.reportGenerationsPerDay !== null &&
      userOverride.reportGenerationsPerDay !== undefined
        ? userOverride.reportGenerationsPerDay
        : profileDefaults.reportGenerationsPerDay,
    concurrentActiveInterviews:
      userOverride.concurrentActiveInterviews !== null &&
      userOverride.concurrentActiveInterviews !== undefined
        ? userOverride.concurrentActiveInterviews
        : profileDefaults.concurrentActiveInterviews,
  };
}

/**
 * QTA-9 & SET-3:
 * Effective limits for an interview:
 * - If user selects durationMinutes > allowed -> { ok: false, field: 'durationMinutes', ... }
 * - If user selects questionCount > allowed -> { ok: false, field: 'questionCount', ... }
 * - If questionCount is omitted -> floor(durationMinutes / 3) capped by allowed maxQuestionsPerInterview (min 1).
 */
export function computeEffectiveInterviewLimits(
  selected: { durationMinutes: number; questionCount?: number | null },
  quota: QuotaProfileLimits,
  candidateDurationOptions: readonly number[] = ALLOWED_DURATION_OPTIONS
):
  | { ok: true; durationMinutes: number; maxQuestions: number }
  | {
      ok: false;
      field: 'durationMinutes' | 'questionCount';
      allowedMax: number;
      allowedValues: number[];
    } {
  if (selected.durationMinutes > quota.maxDurationMinutes) {
    const allowedValues = candidateDurationOptions.filter(
      (d) => d <= quota.maxDurationMinutes
    );
    return {
      ok: false,
      field: 'durationMinutes',
      allowedMax: quota.maxDurationMinutes,
      allowedValues: allowedValues.length > 0 ? allowedValues : [quota.maxDurationMinutes],
    };
  }

  if (
    selected.questionCount !== undefined &&
    selected.questionCount !== null &&
    selected.questionCount > quota.maxQuestionsPerInterview
  ) {
    const allowedValues: number[] = [];
    for (let q = 3; q <= quota.maxQuestionsPerInterview; q++) {
      allowedValues.push(q);
    }
    return {
      ok: false,
      field: 'questionCount',
      allowedMax: quota.maxQuestionsPerInterview,
      allowedValues:
        allowedValues.length > 0 ? allowedValues : [quota.maxQuestionsPerInterview],
    };
  }

  const defaultQuestions = Math.max(1, Math.floor(selected.durationMinutes / 3));
  const requestedQuestions =
    selected.questionCount !== undefined && selected.questionCount !== null
      ? selected.questionCount
      : defaultQuestions;

  const effectiveQuestions = Math.min(requestedQuestions, quota.maxQuestionsPerInterview);
  const effectiveDuration = Math.min(selected.durationMinutes, quota.maxDurationMinutes);

  return {
    ok: true,
    durationMinutes: effectiveDuration,
    maxQuestions: effectiveQuestions,
  };
}

/**
 * QTA-8: A model with no configured price entry is blocked (fail closed).
 * Free-tier models need an explicit price of 0 (0 is valid).
 */
export function validateModelPriceEntry(
  model: string,
  modelPrices: Record<string, ModelPriceEntry | undefined> | null | undefined
):
  | { valid: true; price: { inputUsdPerMillion: Prisma.Decimal; outputUsdPerMillion: Prisma.Decimal } }
  | { valid: false; reason: 'MODEL_PRICE_MISSING' | 'MODEL_PRICE_INVALID' } {
  if (!model || !modelPrices || typeof modelPrices !== 'object') {
    return { valid: false, reason: 'MODEL_PRICE_MISSING' };
  }

  const entry = modelPrices[model];
  if (
    !entry ||
    entry.inputUsdPerMillion === undefined ||
    entry.inputUsdPerMillion === null ||
    entry.outputUsdPerMillion === undefined ||
    entry.outputUsdPerMillion === null
  ) {
    return { valid: false, reason: 'MODEL_PRICE_MISSING' };
  }

  try {
    const inputDec = new Prisma.Decimal(entry.inputUsdPerMillion);
    const outputDec = new Prisma.Decimal(entry.outputUsdPerMillion);
    if (inputDec.isNaN() || outputDec.isNaN() || inputDec.isNeg() || outputDec.isNeg()) {
      return { valid: false, reason: 'MODEL_PRICE_INVALID' };
    }
    return {
      valid: true,
      price: {
        inputUsdPerMillion: inputDec,
        outputUsdPerMillion: outputDec,
      },
    };
  } catch {
    return { valid: false, reason: 'MODEL_PRICE_INVALID' };
  }
}

/**
 * QTA-6, QTA-8, ADM-6:
 * Estimates cost in USD using Prisma.Decimal (never floats).
 * Formula: (inputTokens * inputUsdPerMillion + outputTokens * outputUsdPerMillion) / 1,000,000
 */
export function estimateAiCostUsd(params: {
  inputTokens: number;
  outputTokens: number;
  price: ModelPriceEntry;
}): Prisma.Decimal {
  const inputTokensDec = new Prisma.Decimal(Math.max(0, Math.trunc(params.inputTokens)));
  const outputTokensDec = new Prisma.Decimal(Math.max(0, Math.trunc(params.outputTokens)));
  const inputRate = new Prisma.Decimal(params.price.inputUsdPerMillion);
  const outputRate = new Prisma.Decimal(params.price.outputUsdPerMillion);
  const oneMillion = new Prisma.Decimal(1_000_000);

  const inputCost = inputTokensDec.mul(inputRate).div(oneMillion);
  const outputCost = outputTokensDec.mul(outputRate).div(oneMillion);
  return inputCost.add(outputCost);
}

/**
 * QTA-2, QTA-7:
 * Pure check for whether `used + reserved + needed <= limit` across requests, tokens, and cost budget.
 */
export function canReserveCounter(
  current: {
    requestsUsed: number;
    requestsReserved: number;
    tokensUsed: number;
    tokensReserved: number;
    costUsed: Prisma.Decimal | string | number;
    costReserved?: Prisma.Decimal | string | number;
  },
  needed: {
    requests: number;
    tokens: number;
    cost: Prisma.Decimal | string | number;
  },
  caps: {
    maxRequests: number;
    maxTokens: number;
    maxCostUsd: Prisma.Decimal | string | number;
  }
): {
  allowed: boolean;
  reason?: 'REQUEST_CAP_EXCEEDED' | 'TOKEN_CAP_EXCEEDED' | 'COST_BUDGET_EXCEEDED';
} {
  if (current.requestsUsed + current.requestsReserved + needed.requests > caps.maxRequests) {
    return { allowed: false, reason: 'REQUEST_CAP_EXCEEDED' };
  }

  if (current.tokensUsed + current.tokensReserved + needed.tokens > caps.maxTokens) {
    return { allowed: false, reason: 'TOKEN_CAP_EXCEEDED' };
  }

  const costUsedDec = new Prisma.Decimal(current.costUsed);
  const costReservedDec = new Prisma.Decimal(current.costReserved ?? 0);
  const neededCostDec = new Prisma.Decimal(needed.cost);
  const maxCostDec = new Prisma.Decimal(caps.maxCostUsd);

  if (costUsedDec.add(costReservedDec).add(neededCostDec).gt(maxCostDec)) {
    return { allowed: false, reason: 'COST_BUDGET_EXCEEDED' };
  }

  return { allowed: true };
}

/**
 * ADM-2: remaining = budget - used - reserved (Decimal math, floored at 0 if negative).
 */
export function computeRemainingBudget(
  budget: Prisma.Decimal | string | number,
  used: Prisma.Decimal | string | number,
  reserved: Prisma.Decimal | string | number = 0
): Prisma.Decimal {
  const budgetDec = new Prisma.Decimal(budget);
  const usedDec = new Prisma.Decimal(used);
  const reservedDec = new Prisma.Decimal(reserved);
  const diff = budgetDec.sub(usedDec).sub(reservedDec);
  return diff.isNeg() ? new Prisma.Decimal(0) : diff;
}

/**
 * QTA-10: The warning flag is calculated: used / limit >= warningThreshold.
 * Never stored in the database.
 */
export function calculateUsageWarningFlag(
  used: Prisma.Decimal | string | number,
  limit: Prisma.Decimal | string | number,
  warningThresholdRatio: Prisma.Decimal | string | number = '0.8'
): boolean {
  const usedDec = new Prisma.Decimal(used);
  const limitDec = new Prisma.Decimal(limit);
  const thresholdDec = new Prisma.Decimal(warningThresholdRatio);

  if (limitDec.lte(0)) {
    return true;
  }

  const ratio = usedDec.div(limitDec);
  return ratio.gte(thresholdDec);
}

/**
 * QTA-6:
 * Settling logic:
 * - SUCCEEDED: use token counts reported by provider. If missing, settle at the reserved estimate.
 * - PROVIDER_FAILED (call failed after reaching provider): count 1 request and release the tokens.
 * - RELEASED (aborted before reaching provider): count 0 requests and release all reserved requests/tokens.
 * - EXPIRED (lazy TTL expiry): count 0 requests and release all reserved requests/tokens.
 */
export function computeSettlementDelta(
  reservation: {
    reservedRequests: number;
    reservedTokens: number;
    reservedCost: Prisma.Decimal | string | number;
  },
  outcome: {
    status: 'SUCCEEDED' | 'PROVIDER_FAILED' | 'RELEASED' | 'EXPIRED';
    actualInputTokens?: number | null;
    actualOutputTokens?: number | null;
    price: ModelPriceEntry;
  }
): {
  finalStatus: 'SETTLED' | 'FAILED' | 'RELEASED' | 'EXPIRED';
  actualRequests: number;
  actualTokens: number;
  actualCost: Prisma.Decimal;
  releaseRequests: number;
  releaseTokens: number;
  releaseCost: Prisma.Decimal;
} {
  const reservedCostDec = new Prisma.Decimal(reservation.reservedCost);

  if (outcome.status === 'SUCCEEDED') {
    const hasProviderTokens =
      outcome.actualInputTokens !== undefined &&
      outcome.actualInputTokens !== null &&
      outcome.actualOutputTokens !== undefined &&
      outcome.actualOutputTokens !== null;

    const actualTokens = hasProviderTokens
      ? Math.max(0, Math.trunc(outcome.actualInputTokens!)) +
        Math.max(0, Math.trunc(outcome.actualOutputTokens!))
      : reservation.reservedTokens;

    const actualCost = hasProviderTokens
      ? estimateAiCostUsd({
          inputTokens: outcome.actualInputTokens!,
          outputTokens: outcome.actualOutputTokens!,
          price: outcome.price,
        })
      : reservedCostDec;

    return {
      finalStatus: 'SETTLED',
      actualRequests: reservation.reservedRequests,
      actualTokens,
      actualCost,
      releaseRequests: reservation.reservedRequests,
      releaseTokens: reservation.reservedTokens,
      releaseCost: reservedCostDec,
    };
  }

  if (outcome.status === 'PROVIDER_FAILED') {
    // QTA-6: If the call failed after reaching the provider, count 1 request and release the tokens.
    return {
      finalStatus: 'FAILED',
      actualRequests: Math.min(1, Math.max(1, reservation.reservedRequests)),
      actualTokens: 0,
      actualCost: new Prisma.Decimal(0),
      releaseRequests: reservation.reservedRequests,
      releaseTokens: reservation.reservedTokens,
      releaseCost: reservedCostDec,
    };
  }

  if (outcome.status === 'RELEASED') {
    return {
      finalStatus: 'RELEASED',
      actualRequests: 0,
      actualTokens: 0,
      actualCost: new Prisma.Decimal(0),
      releaseRequests: reservation.reservedRequests,
      releaseTokens: reservation.reservedTokens,
      releaseCost: reservedCostDec,
    };
  }

  return {
    finalStatus: 'EXPIRED',
    actualRequests: 0,
    actualTokens: 0,
    actualCost: new Prisma.Decimal(0),
    releaseRequests: reservation.reservedRequests,
    releaseTokens: reservation.reservedTokens,
    releaseCost: reservedCostDec,
  };
}

/**
 * QTA-6: Checks whether a RESERVED record has exceeded its TTL in seconds.
 */
export function isReservationExpired(
  createdAt: Date,
  now: Date,
  ttlSeconds: number
): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= ttlSeconds * 1000;
}

/**
 * QTA-12: Normalizes and validates a clientRequestId and builds a deterministic composite key.
 */
export function buildIdempotencyKey(scope: {
  userId: string;
  interviewId: string;
  operation: string;
  clientRequestId: string;
}): string {
  const cleanRequestId = scope.clientRequestId.trim();
  if (!cleanRequestId || cleanRequestId.length > 128) {
    throw new Error('Invalid clientRequestId for idempotency key');
  }
  return `${scope.userId}:${scope.interviewId}:${scope.operation}:${cleanRequestId}`;
}
