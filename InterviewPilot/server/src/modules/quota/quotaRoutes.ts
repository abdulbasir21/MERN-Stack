import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { getUtcDayStart } from '../../lib/quotaMath.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { aiEndpointRateLimiter } from '../../middleware/rateLimit.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  getEffectiveQuotaForUser,
  ProviderCallError,
  withAiUsage,
} from '../../services/quota/quotaEngine.js';

export const quotaRouter = Router();

const DevSimulateInputSchema = z
  .object({
    operation: z
      .enum([
        'DOCUMENT_SUMMARY',
        'DOCUMENT_EMBEDDING',
        'QUERY_EMBEDDING',
        'INTERVIEW_PLAN',
        'ANSWER_EVALUATION',
        'CANDIDATE_INQUIRY',
        'REPORT_GENERATION',
        'SPEECH_TRANSCRIPTION',
        'SPEECH_SYNTHESIS',
      ])
      .default('ANSWER_EVALUATION'),
    model: z.string().trim().min(1).optional(),
    estimatedInputTokens: z.number().int().min(0).max(100000).optional(),
    estimatedOutputTokens: z.number().int().min(0).max(100000).optional(),
    actualInputTokens: z.number().int().min(0).max(100000).nullable().optional(),
    actualOutputTokens: z.number().int().min(0).max(100000).nullable().optional(),
    shouldFailProvider: z.boolean().optional(),
  })
  .strict();

quotaRouter.get(
  '/me',
  authenticate,
  requirePermission('profile:read:own'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.actor) {
        throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
      }

      const limits = await getEffectiveQuotaForUser(req.actor.id);
      const periodDayStart = getUtcDayStart(new Date());

      const counter = await prisma.usageCounter.findUnique({
        where: {
          scopeType_scopeId_periodType_periodStart: {
            scopeType: 'USER',
            scopeId: req.actor.id,
            periodType: 'DAY',
            periodStart: periodDayStart,
          },
        },
      });

      const interviewsUsedToday =
        (counter?.interviewsCreated ?? 0) + (counter?.interviewsReserved ?? 0);
      const documentAnalysesUsedToday =
        (counter?.documentAnalyses ?? 0) + (counter?.documentAnalysesReserved ?? 0);
      const reportsUsedToday =
        (counter?.reportsGenerated ?? 0) + (counter?.reportsReserved ?? 0);

      res.status(200).json({
        data: {
          limits,
          usageToday: {
            periodDayStart: periodDayStart.toISOString(),
            interviewsUsed: interviewsUsedToday,
            interviewsRemaining: Math.max(
              0,
              limits.interviewsPerDay - interviewsUsedToday
            ),
            documentAnalysesUsed: documentAnalysesUsedToday,
            documentAnalysesRemaining: Math.max(
              0,
              limits.documentAnalysesPerDay - documentAnalysesUsedToday
            ),
            reportsUsed: reportsUsedToday,
            reportsRemaining: Math.max(
              0,
              limits.reportGenerationsPerDay - reportsUsedToday
            ),
          },
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

quotaRouter.post(
  '/dev-simulate',
  authenticate,
  aiEndpointRateLimiter,
  validateRequest({ body: DevSimulateInputSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (env.NODE_ENV === 'production') {
        throw new AppError('NOT_FOUND', 'Endpoint not available in production.', 404);
      }

      const body = req.body as z.infer<typeof DevSimulateInputSchema>;
      const model = body.model || env.GEMINI_TEXT_MODEL;

      const output = await withAiUsage(
        {
          actorUserId: req.actor?.id,
          operation: body.operation,
          model,
          estimatedInputTokens: body.estimatedInputTokens ?? 250,
          estimatedOutputTokens: body.estimatedOutputTokens ?? 250,
        },
        async () => {
          if (body.shouldFailProvider) {
            throw new ProviderCallError('Simulated upstream provider failure', true);
          }
          return {
            result: { simulated: true, model, operation: body.operation },
            inputTokens: body.actualInputTokens,
            outputTokens: body.actualOutputTokens,
          };
        }
      );

      res.status(200).json({
        data: output,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  }
);
