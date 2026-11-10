import {
  Prisma,
  type AIOperationType,
  type PrismaClient,
  type QuotaProfile,
} from '@prisma/client';
import { prisma as defaultPrisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { getDefaultApplicationSettings } from '../../../prisma/seed.js';
import {
  calculateUsageWarningFlag,
  computeRemainingBudget,
  computeSettlementDelta,
  estimateAiCostUsd,
  getUtcDayStart,
  getUtcMonthStart,
  resolveEffectiveUserQuota,
  validateModelPriceEntry,
  type ModelPriceEntry,
  type QuotaProfileLimits,
} from '../../lib/quotaMath.js';

export interface PlatformAiSettings {
  aiEnabled: boolean;
  demoEnabled: boolean;
  liveDemoEnabled: boolean;
  globalMonthlyRequestCap: number;
  globalMonthlyTokenCap: number;
  globalMonthlyCostBudgetUsd: Prisma.Decimal;
  warningThresholdRatio: Prisma.Decimal;
  demoGlobalInterviewsPerDay: number;
  demoInterviewsPerIpPerDay: number;
  reservationTtlSeconds: number;
  modelPrices: Record<string, ModelPriceEntry | undefined>;
}

export interface AiOperationExecutionResult<T> {
  result: T;
  inputTokens?: number | null;
  outputTokens?: number | null;
  ttsCharacters?: number | null;
}

export interface WithAiUsageParams {
  actorUserId?: string | null;
  interviewId?: string | null;
  operation: AIOperationType;
  model: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  consumeDocumentAnalysis?: boolean;
  consumeInterview?: boolean;
  consumeReport?: boolean;
  /**
   * Optional per-user daily request cap (used by concurrency tests or per-user overrides).
   */
  userDailyRequestCap?: number;
  /**
   * Optional interview-scoped quota check (step 4 in QTA-1).
   */
  interviewQuotaCheck?: {
    allowed: boolean;
    errorCode?: 'EXCEEDS_QUOTA_LIMIT' | 'INQUIRY_LIMIT_REACHED' | 'USER_QUOTA_EXCEEDED';
    message?: string;
  };
  now?: Date;
  db?: PrismaClient;
  /**
   * Test hook to simulate failure inside the reservation transaction to verify QTA-3 fail-closed behavior.
   */
  simulateCounterUpdateFailure?: boolean;
}

export class ProviderCallError extends Error {
  public readonly providerReached: boolean;
  public readonly causeError?: unknown;

  constructor(message: string, providerReached = true, causeError?: unknown) {
    super(message);
    this.name = 'ProviderCallError';
    this.providerReached = providerReached;
    this.causeError = causeError;
  }
}

const DEFAULT_PROFILE_LIMITS: Record<QuotaProfile, QuotaProfileLimits> = {
  DEMO: {
    interviewsPerDay: 1,
    maxDurationMinutes: 5,
    maxQuestionsPerInterview: 3,
    maxInquiriesPerInterview: 1,
    documentAnalysesPerDay: 0,
    reportGenerationsPerDay: 1,
    concurrentActiveInterviews: 1,
  },
  FREE_USER: {
    interviewsPerDay: 2,
    maxDurationMinutes: 15,
    maxQuestionsPerInterview: 10,
    maxInquiriesPerInterview: 3,
    documentAnalysesPerDay: 2,
    reportGenerationsPerDay: 2,
    concurrentActiveInterviews: 1,
  },
};

const PASS_THROUGH_ERROR_CODES = new Set([
  'UNAUTHENTICATED',
  'ACCOUNT_BLOCKED',
  'FORBIDDEN',
  'USER_QUOTA_EXCEEDED',
  'EXCEEDS_QUOTA_LIMIT',
  'INQUIRY_LIMIT_REACHED',
  'GLOBAL_BUDGET_EXHAUSTED',
  'AI_DISABLED',
  'AI_UNAVAILABLE',
]);

/**
 * QTA-4: Reads ApplicationSetting rows directly from the database on every call (never cached).
 */
export async function loadPlatformAiSettings(
  db: PrismaClient = defaultPrisma
): Promise<PlatformAiSettings> {
  const rows = await db.applicationSetting.findMany();
  const map = new Map<string, unknown>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }

  const defaults = getDefaultApplicationSettings();
  const getVal = <K>(key: string, fallback: K): K => {
    if (map.has(key)) {
      return map.get(key) as K;
    }
    return fallback;
  };

  return {
    aiEnabled: Boolean(getVal('aiEnabled', defaults.aiEnabled)),
    demoEnabled: Boolean(getVal('demoEnabled', defaults.demoEnabled)),
    liveDemoEnabled: Boolean(getVal('liveDemoEnabled', defaults.liveDemoEnabled)),
    globalMonthlyRequestCap: Number(
      getVal('globalMonthlyRequestCap', defaults.globalMonthlyRequestCap)
    ),
    globalMonthlyTokenCap: Number(
      getVal('globalMonthlyTokenCap', defaults.globalMonthlyTokenCap)
    ),
    globalMonthlyCostBudgetUsd: new Prisma.Decimal(
      String(getVal('globalMonthlyCostBudgetUsd', defaults.globalMonthlyCostBudgetUsd))
    ),
    warningThresholdRatio: new Prisma.Decimal(
      String(getVal('warningThresholdRatio', defaults.warningThresholdRatio))
    ),
    demoGlobalInterviewsPerDay: Number(
      getVal('demoGlobalInterviewsPerDay', defaults.demoGlobalInterviewsPerDay)
    ),
    demoInterviewsPerIpPerDay: Number(
      getVal('demoInterviewsPerIpPerDay', defaults.demoInterviewsPerIpPerDay)
    ),
    reservationTtlSeconds: Number(
      getVal('reservationTtlSeconds', defaults.reservationTtlSeconds)
    ),
    modelPrices: getVal(
      'modelPrices',
      defaults.modelPrices as Record<string, ModelPriceEntry | undefined>
    ),
  };
}

export async function getEffectiveQuotaForUser(
  userId: string,
  db: PrismaClient = defaultPrisma
): Promise<QuotaProfileLimits> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { quota: true },
  });
  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
  }

  const profileKey: QuotaProfile = user.isDemo ? 'DEMO' : 'FREE_USER';
  const configRow = await db.quotaConfiguration.findUnique({
    where: { profile: profileKey },
  });

  const baseLimits: QuotaProfileLimits = configRow
    ? {
        interviewsPerDay: configRow.interviewsPerDay,
        maxDurationMinutes: configRow.maxDurationMinutes,
        maxQuestionsPerInterview: configRow.maxQuestionsPerInterview,
        maxInquiriesPerInterview: configRow.maxInquiriesPerInterview,
        documentAnalysesPerDay: configRow.documentAnalysesPerDay,
        reportGenerationsPerDay: configRow.reportGenerationsPerDay,
        concurrentActiveInterviews: configRow.concurrentActiveInterviews,
      }
    : DEFAULT_PROFILE_LIMITS[profileKey];

  return resolveEffectiveUserQuota(baseLimits, user.quota);
}

/**
 * QTA-6: Lazily expires any RESERVED records older than reservationTtlSeconds,
 * releasing their reserved requests, tokens, and cost on the corresponding UsageCounter rows.
 */
export async function expireStaleReservations(
  now: Date = new Date(),
  ttlSeconds = 300,
  db: PrismaClient = defaultPrisma
): Promise<number> {
  const cutoff = new Date(now.getTime() - ttlSeconds * 1000);
  const staleRecords = await db.aIUsageRecord.findMany({
    where: {
      status: 'RESERVED',
      createdAt: { lte: cutoff },
    },
    take: 50,
  });

  if (staleRecords.length === 0) {
    return 0;
  }

  let expiredCount = 0;

  for (const record of staleRecords) {
    await db.$transaction(
      async (tx) => {
        const updated = await tx.aIUsageRecord.updateMany({
          where: { id: record.id, status: 'RESERVED' },
          data: { status: 'EXPIRED' },
        });

        if (updated.count === 0) {
          return;
        }

        expiredCount += 1;

        const docReserveDelta = record.operation === 'DOCUMENT_SUMMARY' ? 1 : 0;
        const reportReserveDelta = record.operation === 'REPORT_GENERATION' ? 1 : 0;

        await tx.$executeRaw`
          UPDATE "UsageCounter"
          SET
            "requestsReserved" = GREATEST(0, "requestsReserved" - ${record.reservedRequests}),
            "tokensReserved" = GREATEST(0, "tokensReserved" - ${record.reservedTokens}),
            "costReserved" = GREATEST(0, "costReserved" - ${record.reservedCost}),
            "documentAnalysesReserved" = CASE
              WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "documentAnalysesReserved" - ${docReserveDelta})
              ELSE "documentAnalysesReserved"
            END,
            "reportsReserved" = CASE
              WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "reportsReserved" - ${reportReserveDelta})
              ELSE "reportsReserved"
            END,
            "updatedAt" = NOW()
          WHERE (
            "scopeType" = 'GLOBAL'::"UsageScopeType"
            AND "scopeId" = 'GLOBAL'
            AND "periodType" = 'MONTH'::"UsagePeriodType"
            AND "periodStart" = ${record.periodMonthStart}
          ) OR (
            ${record.userId !== null}
            AND "scopeType" = 'USER'::"UsageScopeType"
            AND "scopeId" = ${record.userId ?? ''}
            AND "periodType" = 'DAY'::"UsagePeriodType"
            AND "periodStart" = ${record.periodDayStart}
          )
        `;
      },
      { maxWait: 20000, timeout: 30000 }
    );
  }

  return expiredCount;
}

/**
 * QTA-1 to QTA-8:
 * Single mandatory wrapper for EVERY AI call in InterviewPilot.
 * Enforces strict 10-step order:
 *  (1) authenticate
 *  (2) account status ACTIVE
 *  (3) per-user quota
 *  (4) interview quota
 *  (5) global budget
 *  (6) aiEnabled and model availability/price
 *  (7) atomic conditional reservation
 *  (8) run the operation
 *  (9) record actual usage
 *  (10) settle/release the reservation
 */
export async function withAiUsage<T>(
  params: WithAiUsageParams,
  executeFn: () => Promise<AiOperationExecutionResult<T>>
): Promise<T> {
  const db = params.db || defaultPrisma;
  const now = params.now || new Date();

  // Step 1: Authenticate
  if (!params.actorUserId || typeof params.actorUserId !== 'string') {
    throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
  }

  let user: {
    id: string;
    status: 'ACTIVE' | 'BLOCKED' | 'DELETING';
    isDemo: boolean;
    quota: {
      interviewsPerDay: number | null;
      maxDurationMinutes: number | null;
      maxQuestionsPerInterview: number | null;
      maxInquiriesPerInterview: number | null;
      documentAnalysesPerDay: number | null;
      reportGenerationsPerDay: number | null;
      concurrentActiveInterviews: number | null;
    } | null;
  } | null = null;
  let settings: PlatformAiSettings;
  let profileConfigs: Array<{
    profile: QuotaProfile;
    interviewsPerDay: number;
    maxDurationMinutes: number;
    maxQuestionsPerInterview: number;
    maxInquiriesPerInterview: number;
    documentAnalysesPerDay: number;
    reportGenerationsPerDay: number;
    concurrentActiveInterviews: number;
  }> = [];

  try {
    // Parallelize read-only user + settings + quotaConfig lookup (never touches UsageCounter)
    const [fetchedUser, fetchedSettings, fetchedConfigs] = await Promise.all([
      db.user.findUnique({
        where: { id: params.actorUserId },
        select: {
          id: true,
          status: true,
          isDemo: true,
          quota: true,
        },
      }),
      loadPlatformAiSettings(db),
      db.quotaConfiguration.findMany(),
    ]);
    user = fetchedUser;
    settings = fetchedSettings;
    profileConfigs = fetchedConfigs;
  } catch {
    throw new AppError(
      'AI_UNAVAILABLE',
      'AI usage tracking is currently unavailable.',
      503
    );
  }

  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
  }

  // Step 2: Account status ACTIVE (blocked/deleting users never reach quota step)
  if (user.status !== 'ACTIVE') {
    throw new AppError(
      'ACCOUNT_BLOCKED',
      'Your account is blocked or scheduled for deletion.',
      403
    );
  }

  // Wrap Steps 3-7 in fail-closed handler (QTA-3)
  let reservationId = '';
  let reservedTokens = 0;
  let reservedCost = new Prisma.Decimal(0);
  let validatedPrice: {
    inputUsdPerMillion: Prisma.Decimal;
    outputUsdPerMillion: Prisma.Decimal;
  } = {
    inputUsdPerMillion: new Prisma.Decimal(0),
    outputUsdPerMillion: new Prisma.Decimal(0),
  };
  const periodDayStart = getUtcDayStart(now);
  const periodMonthStart = getUtcMonthStart(now);
  const needDocAnalysis =
    params.consumeDocumentAnalysis ?? params.operation === 'DOCUMENT_SUMMARY';
  const needInterview = params.consumeInterview ?? false;
  const needReport =
    params.consumeReport ?? params.operation === 'REPORT_GENERATION';

  try {
    if (params.simulateCounterUpdateFailure) {
      throw new Error('Simulated database counter failure');
    }

    // Step 3: Per-user quota check (QTA-1, QTA-15)
    const profileKey: QuotaProfile = user.isDemo ? 'DEMO' : 'FREE_USER';
    const profileConfig = profileConfigs.find((c) => c.profile === profileKey);
    const baseLimits = profileConfig
      ? {
          interviewsPerDay: profileConfig.interviewsPerDay,
          maxDurationMinutes: profileConfig.maxDurationMinutes,
          maxQuestionsPerInterview: profileConfig.maxQuestionsPerInterview,
          maxInquiriesPerInterview: profileConfig.maxInquiriesPerInterview,
          documentAnalysesPerDay: profileConfig.documentAnalysesPerDay,
          reportGenerationsPerDay: profileConfig.reportGenerationsPerDay,
          concurrentActiveInterviews: profileConfig.concurrentActiveInterviews,
        }
      : DEFAULT_PROFILE_LIMITS[profileKey];

    const effectiveUserQuota = resolveEffectiveUserQuota(baseLimits, user.quota);

    if (needDocAnalysis && effectiveUserQuota.documentAnalysesPerDay <= 0) {
      throw new AppError(
        'USER_QUOTA_EXCEEDED',
        'Document analysis is not permitted under your current quota.',
        429
      );
    }
    if (needInterview && effectiveUserQuota.interviewsPerDay <= 0) {
      throw new AppError(
        'USER_QUOTA_EXCEEDED',
        'Daily interview quota has been reached.',
        429
      );
    }
    if (needReport && effectiveUserQuota.reportGenerationsPerDay <= 0) {
      throw new AppError(
        'USER_QUOTA_EXCEEDED',
        'Daily report generation quota has been reached.',
        429
      );
    }

    // Step 4: Interview quota check (QTA-1)
    if (params.interviewQuotaCheck && !params.interviewQuotaCheck.allowed) {
      throw new AppError(
        params.interviewQuotaCheck.errorCode || 'EXCEEDS_QUOTA_LIMIT',
        params.interviewQuotaCheck.message ||
          'Interview quota limit reached for this session.',
        422
      );
    }

    const estIn = Math.max(0, Math.trunc(params.estimatedInputTokens ?? 500));
    const estOut = Math.max(0, Math.trunc(params.estimatedOutputTokens ?? 500));
    reservedTokens = estIn + estOut;

    const priceCheck = validateModelPriceEntry(params.model, settings.modelPrices);
    const provisionalPrice = priceCheck.valid
      ? priceCheck.price
      : {
          inputUsdPerMillion: new Prisma.Decimal(0),
          outputUsdPerMillion: new Prisma.Decimal(0),
        };
    reservedCost = estimateAiCostUsd({
      inputTokens: estIn,
      outputTokens: estOut,
      price: provisionalPrice,
    });

    // Lazily release expired reservations + pre-check global counter in parallel
    const [, existingGlobalCounter] = await Promise.all([
      expireStaleReservations(now, settings.reservationTtlSeconds, db),
      db.usageCounter.findUnique({
        where: {
          scopeType_scopeId_periodType_periodStart: {
            scopeType: 'GLOBAL',
            scopeId: 'GLOBAL',
            periodType: 'MONTH',
            periodStart: periodMonthStart,
          },
        },
      }),
    ]);

    // Step 5: Global budget pre-check (QTA-1, QTA-7)
    if (existingGlobalCounter) {
      if (
        existingGlobalCounter.requestsUsed +
          existingGlobalCounter.requestsReserved +
          1 >
          settings.globalMonthlyRequestCap ||
        existingGlobalCounter.tokensUsed +
          existingGlobalCounter.tokensReserved +
          reservedTokens >
          settings.globalMonthlyTokenCap ||
        existingGlobalCounter.costUsed
          .add(existingGlobalCounter.costReserved)
          .add(reservedCost)
          .gt(settings.globalMonthlyCostBudgetUsd)
      ) {
        throw new AppError(
          'GLOBAL_BUDGET_EXHAUSTED',
          'The platform AI budget for this month has been reached. Your dashboard and history remain available.',
          503
        );
      }
    }

    // Step 6: aiEnabled and model availability/price check (QTA-4, QTA-8)
    if (!settings.aiEnabled) {
      throw new AppError(
        'AI_DISABLED',
        'AI features are currently disabled by the administrator.',
        503
      );
    }

    if (!priceCheck.valid) {
      throw new AppError(
        'AI_UNAVAILABLE',
        `Model "${params.model}" does not have a valid configured price entry.`,
        503
      );
    }
    validatedPrice = priceCheck.price;

    // Step 7: Atomic conditional SQL reservation (QTA-2)
    const userId = user.id;
    const docDelta = needDocAnalysis ? 1 : 0;
    const interviewDelta = needInterview ? 1 : 0;
    const reportDelta = needReport ? 1 : 0;
    const userReqCap = params.userDailyRequestCap ?? 1_000_000;

    // Ensure both counter rows exist in a single SQL statement
    await db.$executeRaw`
      INSERT INTO "UsageCounter" (
        "id", "scopeType", "scopeId", "periodType", "periodStart", "updatedAt"
      )
      VALUES
        (
          ${`uc_user_${userId}_${periodDayStart.getTime()}`},
          'USER'::"UsageScopeType",
          ${userId},
          'DAY'::"UsagePeriodType",
          ${periodDayStart},
          NOW()
        ),
        (
          ${`uc_global_${periodMonthStart.getTime()}`},
          'GLOBAL'::"UsageScopeType",
          'GLOBAL',
          'MONTH'::"UsagePeriodType",
          ${periodMonthStart},
          NOW()
        )
      ON CONFLICT ("scopeType", "scopeId", "periodType", "periodStart") DO NOTHING
    `;

    reservationId = await db.$transaction(
      async (tx) => {
        // Atomic conditional update on USER DAY counter (QTA-2)
        const userUpdatedRows = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE "UsageCounter"
          SET
            "requestsReserved" = "requestsReserved" + 1,
            "tokensReserved" = "tokensReserved" + ${reservedTokens},
            "costReserved" = "costReserved" + ${reservedCost},
            "documentAnalysesReserved" = "documentAnalysesReserved" + ${docDelta},
            "interviewsReserved" = "interviewsReserved" + ${interviewDelta},
            "reportsReserved" = "reportsReserved" + ${reportDelta},
            "updatedAt" = NOW()
          WHERE "scopeType" = 'USER'::"UsageScopeType"
            AND "scopeId" = ${userId}
            AND "periodType" = 'DAY'::"UsagePeriodType"
            AND "periodStart" = ${periodDayStart}
            AND ("requestsUsed" + "requestsReserved" + 1 <= ${userReqCap})
            AND (${docDelta} = 0 OR ("documentAnalyses" + "documentAnalysesReserved" + ${docDelta} <= ${effectiveUserQuota.documentAnalysesPerDay}))
            AND (${interviewDelta} = 0 OR ("interviewsCreated" + "interviewsReserved" + ${interviewDelta} <= ${effectiveUserQuota.interviewsPerDay}))
            AND (${reportDelta} = 0 OR ("reportsGenerated" + "reportsReserved" + ${reportDelta} <= ${effectiveUserQuota.reportGenerationsPerDay}))
          RETURNING "id"
        `;

        if (userUpdatedRows.length === 0) {
          throw new AppError(
            'USER_QUOTA_EXCEEDED',
            'Your daily quota limit has been reached.',
            429
          );
        }

        // Atomic conditional update on GLOBAL MONTH counter (QTA-2)
        const globalUpdatedRows = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE "UsageCounter"
          SET
            "requestsReserved" = "requestsReserved" + 1,
            "tokensReserved" = "tokensReserved" + ${reservedTokens},
            "costReserved" = "costReserved" + ${reservedCost},
            "updatedAt" = NOW()
          WHERE "scopeType" = 'GLOBAL'::"UsageScopeType"
            AND "scopeId" = 'GLOBAL'
            AND "periodType" = 'MONTH'::"UsagePeriodType"
            AND "periodStart" = ${periodMonthStart}
            AND ("requestsUsed" + "requestsReserved" + 1 <= ${settings.globalMonthlyRequestCap})
            AND ("tokensUsed" + "tokensReserved" + ${reservedTokens} <= ${settings.globalMonthlyTokenCap})
            AND ("costUsed" + "costReserved" + ${reservedCost} <= ${settings.globalMonthlyCostBudgetUsd})
          RETURNING "id"
        `;

        if (globalUpdatedRows.length === 0) {
          throw new AppError(
            'GLOBAL_BUDGET_EXHAUSTED',
            'The platform AI budget for this month has been reached.',
            503
          );
        }

        const usageRecord = await tx.aIUsageRecord.create({
          data: {
            userId,
            interviewId: params.interviewId ?? null,
            operation: params.operation,
            model: params.model,
            status: 'RESERVED',
            reservedRequests: 1,
            reservedTokens,
            reservedCost,
            periodDayStart,
            periodMonthStart,
          },
        });

        return usageRecord.id;
      },
      { maxWait: 30000, timeout: 30000 }
    );
  } catch (err) {
    if (err instanceof AppError && PASS_THROUGH_ERROR_CODES.has(err.code)) {
      throw err;
    }
    // QTA-3: Fail closed if usage tracking or reservation transaction fails for any unexpected reason
    throw new AppError(
      'AI_UNAVAILABLE',
      'AI usage reservation failed; failing closed without making an AI call.',
      503
    );
  }

  // Step 8: Run the AI operation outside the DB transaction
  const docDelta = needDocAnalysis ? 1 : 0;
  const interviewDelta = needInterview ? 1 : 0;
  const reportDelta = needReport ? 1 : 0;

  try {
    const execOut = await executeFn();

    // Steps 9 & 10: Record actual usage and settle reservation in a single batch transaction (QTA-6)
    const settlement = computeSettlementDelta(
      {
        reservedRequests: 1,
        reservedTokens,
        reservedCost,
      },
      {
        status: 'SUCCEEDED',
        actualInputTokens: execOut.inputTokens,
        actualOutputTokens: execOut.outputTokens,
        price: validatedPrice,
      }
    );

    const actualInputTokens =
      execOut.inputTokens !== undefined && execOut.inputTokens !== null
        ? Math.max(0, Math.trunc(execOut.inputTokens))
        : Math.floor(settlement.actualTokens / 2);
    const actualOutputTokens =
      execOut.outputTokens !== undefined && execOut.outputTokens !== null
        ? Math.max(0, Math.trunc(execOut.outputTokens))
        : settlement.actualTokens - actualInputTokens;
    const ttsChars = Math.max(0, Math.trunc(execOut.ttsCharacters ?? 0));

    await db.$transaction([
      db.aIUsageRecord.update({
        where: { id: reservationId },
        data: {
          status: 'SETTLED',
          actualRequests: settlement.actualRequests,
          actualInputTokens,
          actualOutputTokens,
          actualTokens: settlement.actualTokens,
          ttsCharacters: ttsChars,
          costEstimated: settlement.actualCost,
        },
      }),
      db.$executeRaw`
        UPDATE "UsageCounter"
        SET
          "requestsReserved" = GREATEST(0, "requestsReserved" - ${settlement.releaseRequests}),
          "requestsUsed" = "requestsUsed" + ${settlement.actualRequests},
          "tokensReserved" = GREATEST(0, "tokensReserved" - ${settlement.releaseTokens}),
          "tokensUsed" = "tokensUsed" + ${settlement.actualTokens},
          "costReserved" = GREATEST(0, "costReserved" - ${settlement.releaseCost}),
          "costUsed" = "costUsed" + ${settlement.actualCost},
          "documentAnalysesReserved" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "documentAnalysesReserved" - ${docDelta})
            ELSE "documentAnalysesReserved"
          END,
          "documentAnalyses" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN "documentAnalyses" + ${docDelta}
            ELSE "documentAnalyses"
          END,
          "interviewsReserved" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "interviewsReserved" - ${interviewDelta})
            ELSE "interviewsReserved"
          END,
          "interviewsCreated" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN "interviewsCreated" + ${interviewDelta}
            ELSE "interviewsCreated"
          END,
          "reportsReserved" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "reportsReserved" - ${reportDelta})
            ELSE "reportsReserved"
          END,
          "reportsGenerated" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN "reportsGenerated" + ${reportDelta}
            ELSE "reportsGenerated"
          END,
          "updatedAt" = NOW()
        WHERE (
          "scopeType" = 'USER'::"UsageScopeType"
          AND "scopeId" = ${user.id}
          AND "periodType" = 'DAY'::"UsagePeriodType"
          AND "periodStart" = ${periodDayStart}
        ) OR (
          "scopeType" = 'GLOBAL'::"UsageScopeType"
          AND "scopeId" = 'GLOBAL'
          AND "periodType" = 'MONTH'::"UsagePeriodType"
          AND "periodStart" = ${periodMonthStart}
        )
      `,
    ]);

    return execOut.result;
  } catch (providerErr) {
    // QTA-6: If the call failed after reaching the provider, count 1 request and release the tokens.
    const providerReached =
      providerErr instanceof ProviderCallError ? providerErr.providerReached : true;

    const failSettlement = computeSettlementDelta(
      {
        reservedRequests: 1,
        reservedTokens,
        reservedCost,
      },
      {
        status: providerReached ? 'PROVIDER_FAILED' : 'RELEASED',
        price: validatedPrice,
      }
    );

    await db.$transaction([
      db.aIUsageRecord.update({
        where: { id: reservationId },
        data: {
          status: failSettlement.finalStatus,
          actualRequests: failSettlement.actualRequests,
          actualInputTokens: 0,
          actualOutputTokens: 0,
          actualTokens: 0,
          costEstimated: new Prisma.Decimal(0),
        },
      }),
      db.$executeRaw`
        UPDATE "UsageCounter"
        SET
          "requestsReserved" = GREATEST(0, "requestsReserved" - ${failSettlement.releaseRequests}),
          "requestsUsed" = "requestsUsed" + ${failSettlement.actualRequests},
          "tokensReserved" = GREATEST(0, "tokensReserved" - ${failSettlement.releaseTokens}),
          "costReserved" = GREATEST(0, "costReserved" - ${failSettlement.releaseCost}),
          "documentAnalysesReserved" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "documentAnalysesReserved" - ${docDelta})
            ELSE "documentAnalysesReserved"
          END,
          "interviewsReserved" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "interviewsReserved" - ${interviewDelta})
            ELSE "interviewsReserved"
          END,
          "reportsReserved" = CASE
            WHEN "scopeType" = 'USER'::"UsageScopeType" THEN GREATEST(0, "reportsReserved" - ${reportDelta})
            ELSE "reportsReserved"
          END,
          "updatedAt" = NOW()
        WHERE (
          "scopeType" = 'USER'::"UsageScopeType"
          AND "scopeId" = ${user.id}
          AND "periodType" = 'DAY'::"UsagePeriodType"
          AND "periodStart" = ${periodDayStart}
        ) OR (
          "scopeType" = 'GLOBAL'::"UsageScopeType"
          AND "scopeId" = 'GLOBAL'
          AND "periodType" = 'MONTH'::"UsagePeriodType"
          AND "periodStart" = ${periodMonthStart}
        )
      `,
    ]);

    throw providerErr;
  }
}

/**
 * QTA-10 & ADM-2:
 * Computes global budget status and warning flags at read time (never stored).
 */
export async function getGlobalBudgetSnapshot(
  now: Date = new Date(),
  db: PrismaClient = defaultPrisma
) {
  const settings = await loadPlatformAiSettings(db);
  const periodMonthStart = getUtcMonthStart(now);

  const counter = await db.usageCounter.findUnique({
    where: {
      scopeType_scopeId_periodType_periodStart: {
        scopeType: 'GLOBAL',
        scopeId: 'GLOBAL',
        periodType: 'MONTH',
        periodStart: periodMonthStart,
      },
    },
  });

  const requestsUsed = counter?.requestsUsed ?? 0;
  const requestsReserved = counter?.requestsReserved ?? 0;
  const tokensUsed = counter?.tokensUsed ?? 0;
  const tokensReserved = counter?.tokensReserved ?? 0;
  const costUsed = counter?.costUsed ?? new Prisma.Decimal(0);
  const costReserved = counter?.costReserved ?? new Prisma.Decimal(0);

  const remainingBudgetUsd = computeRemainingBudget(
    settings.globalMonthlyCostBudgetUsd,
    costUsed,
    costReserved
  );

  return {
    aiEnabled: settings.aiEnabled,
    periodMonthStart: periodMonthStart.toISOString(),
    requestsUsed,
    requestsReserved,
    requestCap: settings.globalMonthlyRequestCap,
    requestWarning: calculateUsageWarningFlag(
      requestsUsed,
      settings.globalMonthlyRequestCap,
      settings.warningThresholdRatio
    ),
    tokensUsed,
    tokensReserved,
    tokenCap: settings.globalMonthlyTokenCap,
    tokenWarning: calculateUsageWarningFlag(
      tokensUsed,
      settings.globalMonthlyTokenCap,
      settings.warningThresholdRatio
    ),
    costUsedUsd: costUsed.toFixed(6),
    costReservedUsd: costReserved.toFixed(6),
    costBudgetUsd: settings.globalMonthlyCostBudgetUsd.toFixed(6),
    remainingBudgetUsd: remainingBudgetUsd.toFixed(6),
    costWarning: calculateUsageWarningFlag(
      costUsed,
      settings.globalMonthlyCostBudgetUsd,
      settings.warningThresholdRatio
    ),
  };
}
