import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import {
  calculateAnswerScore,
  calculateOverallScore,
  calculateSkillBreakdown,
  calculateStarCoverage,
  calculateDurationSeconds,
  filterInterviewHistory,
  compareInterviewSkills,
  type CriterionScoreItem,
  type StarPresence,
} from '@interviewpilot/shared';
import { getReportGenerator } from '../../services/report/reportService.js';
import { ReportStatus } from '@prisma/client';

export async function getInterviewReportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.actor?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const interviewId = String(req.params.id);

    // SEC-1: Scope/ownership check; another user's interview returns 404, not 403
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        configuration: true,
        report: true,
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answer: {
              include: {
                evaluation: true,
              },
            },
          },
        },
      },
    });

    if (!interview || interview.userId !== userId) {
      throw new AppError('NOT_FOUND', 'Interview not found.', 404);
    }

    // Dynamic metrics calculation (RPT-1, RPT-5)
    const evaluatedAnswers: Array<{
      criteriaScores: CriterionScoreItem[];
      isEmpty: boolean;
      star?: StarPresence | null;
      score: number;
    }> = [];

    const questionDetails = interview.questions.map((q) => {
      const ans = q.answer;
      const evalData = ans?.evaluation;
      const criteria = (evalData?.criteriaScores as unknown as CriterionScoreItem[]) || [];
      const starParts = (evalData?.starParts as unknown as StarPresence) || null;
      const isEmpty = ans?.isEmpty ?? (ans ? false : true);

      // EVL-2 & EVL-4: Calculate answer score on read
      const answerScore = ans ? calculateAnswerScore(criteria, isEmpty) : 0;

      if (ans && evalData) {
        evaluatedAnswers.push({
          criteriaScores: criteria,
          isEmpty,
          star: starParts,
          score: answerScore,
        });
      }

      return {
        id: q.id,
        orderIndex: q.orderIndex,
        topic: q.topic,
        kind: q.kind,
        difficulty: q.difficulty,
        questionText: q.text,
        candidateAnswer: ans
          ? {
              id: ans.id,
              transcript: ans.transcript,
              isEmpty: ans.isEmpty,
              durationSeconds: ans.durationSeconds,
              score: answerScore,
              evaluation: evalData
                ? {
                    id: evalData.id,
                    criteriaScores: criteria,
                    starParts,
                    correct: evalData.correct,
                    missing: evalData.missing,
                    strengths: evalData.strengths,
                    weaknesses: evalData.weaknesses,
                    improvements: evalData.improvements,
                    idealAnswer: evalData.idealAnswer,
                    followUpRecommendation: evalData.followUpRecommendation,
                    reasoning: evalData.reasoning,
                  }
                : null,
            }
          : null,
      };
    });

    const answerScores = evaluatedAnswers.map((a) => a.score);
    const overallScore = calculateOverallScore(answerScores);
    const skillBreakdown = calculateSkillBreakdown(evaluatedAnswers);
    const isBehavioral = interview.configuration?.type === 'BEHAVIORAL';
    const starCoverage = isBehavioral ? calculateStarCoverage(evaluatedAnswers) : null;
    const durationSeconds = calculateDurationSeconds(interview.startedAt, interview.endedAt);

    res.status(200).json({
      data: {
        interview: {
          id: interview.id,
          mode: interview.mode,
          status: interview.status,
          role: interview.configuration?.role || 'Interview Session',
          type: interview.configuration?.type || 'TECHNICAL',
          experienceLevel: interview.configuration?.experienceLevel || 'MID',
          startedAt: interview.startedAt,
          endedAt: interview.endedAt,
          endReason: interview.endReason,
        },
        metrics: {
          overallScore,
          durationSeconds,
          totalQuestions: interview.questions.length,
          evaluatedAnswersCount: evaluatedAnswers.length,
          skillBreakdown,
          starCoverage,
        },
        report: interview.report
          ? {
              id: interview.report.id,
              status: interview.report.status,
              summary: interview.report.summary,
              strengths: interview.report.strengths,
              weaknesses: interview.report.weaknesses,
              recommendations: interview.report.recommendations,
              studyTopics: interview.report.studyTopics,
              generatedAt: interview.report.generatedAt,
            }
          : null,
        questions: questionDetails,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function generateInterviewReportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.actor?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const interviewId = String(req.params.id);

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        configuration: true,
        report: true,
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answer: {
              include: {
                evaluation: true,
              },
            },
          },
        },
      },
    });

    if (!interview || interview.userId !== userId) {
      throw new AppError('NOT_FOUND', 'Interview not found.', 404);
    }

    // RPT-3: One report per interview; regeneration is out of scope
    if (interview.report?.status === 'READY') {
      res.status(200).json({
        data: { report: interview.report },
      });
      return;
    }

    // RPT-2: Report created only when >= 1 answer was evaluated
    const evaluatedQuestions = interview.questions.filter((q) => q.answer?.evaluation);
    if (evaluatedQuestions.length === 0) {
      throw new AppError(
        'INVALID_STATE',
        'Cannot generate report. At least one answer must be evaluated.',
        400
      );
    }

    // Prepare compact digest
    const evaluationsDigest = evaluatedQuestions.map((q) => {
      const evalData = q.answer!.evaluation!;
      const criteria = (evalData.criteriaScores as unknown as CriterionScoreItem[]) || [];
      const score = calculateAnswerScore(criteria, q.answer!.isEmpty);
      return {
        topic: q.topic,
        questionText: q.text,
        score,
        correct: evalData.correct,
        missing: evalData.missing,
        strengths: (evalData.strengths as unknown as string[]) || [],
        weaknesses: (evalData.weaknesses as unknown as string[]) || [],
        improvements: (evalData.improvements as unknown as string[]) || [],
      };
    });

    const answerScores = evaluationsDigest.map((e) => e.score);
    const overallScore = calculateOverallScore(answerScores);

    const reportGenerator = getReportGenerator();

    try {
      const generated = await reportGenerator.generateReport({
        interviewId: interview.id,
        userId,
        role: interview.configuration?.role || 'Engineer',
        type: interview.configuration?.type || 'TECHNICAL',
        overallScore,
        evaluationsDigest,
      });

      // Save report in PostgreSQL
      const savedReport = await prisma.interviewReport.upsert({
        where: { interviewId: interview.id },
        update: {
          status: ReportStatus.READY,
          summary: generated.summary,
          strengths: generated.strengths,
          weaknesses: generated.weaknesses,
          recommendations: generated.recommendations,
          studyTopics: generated.studyTopics,
          generatedAt: new Date(),
          failureReason: null,
        },
        create: {
          interviewId: interview.id,
          status: ReportStatus.READY,
          summary: generated.summary,
          strengths: generated.strengths,
          weaknesses: generated.weaknesses,
          recommendations: generated.recommendations,
          studyTopics: generated.studyTopics,
          generatedAt: new Date(),
        },
      });

      res.status(200).json({
        data: { report: savedReport },
      });
    } catch (aiErr: unknown) {
      // RPT-2: If quota or AI is unavailable, report status is PENDING and numbers still show
      const pendingReport = await prisma.interviewReport.upsert({
        where: { interviewId: interview.id },
        update: {
          status: ReportStatus.PENDING,
          failureReason: aiErr instanceof Error ? aiErr.message : 'AI temporarily unavailable',
        },
        create: {
          interviewId: interview.id,
          status: ReportStatus.PENDING,
          failureReason: aiErr instanceof Error ? aiErr.message : 'AI temporarily unavailable',
        },
      });

      res.status(200).json({
        data: { report: pendingReport },
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function getInterviewHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.actor?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    // Query parameters
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

    // RPT-6: Own interviews only, newest first
    const interviews = await prisma.interview.findMany({
      where: {
        userId,
        status: { not: 'CREATED' },
      },
      include: {
        configuration: true,
        questions: {
          include: {
            answer: {
              include: {
                evaluation: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map and calculate derived scores on the fly
    const mapped = interviews.map((inv) => {
      const answerScores = inv.questions
        .filter((q) => q.answer && q.answer.evaluation)
        .map((q) => {
          const evalData = q.answer!.evaluation!;
          const criteria = (evalData.criteriaScores as unknown as CriterionScoreItem[]) || [];
          return calculateAnswerScore(criteria, q.answer!.isEmpty);
        });

      const overallScore = calculateOverallScore(answerScores);
      const durationSeconds = calculateDurationSeconds(inv.startedAt, inv.endedAt);

      return {
        id: inv.id,
        role: inv.configuration?.role || 'Interview Session',
        type: inv.configuration?.type || 'TECHNICAL',
        createdAt: inv.createdAt.toISOString(),
        overallScore,
        durationSeconds,
        status: inv.status,
      };
    });

    // Pure filtering and pagination (RPT-6)
    const result = filterInterviewHistory(mapped, {
      role,
      type,
      startDate,
      endDate,
      page,
      pageSize,
    });

    res.status(200).json({
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProgressHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.actor?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    // RPT-7: Completed interviews list of (date, overallScore)
    const completedInterviews = await prisma.interview.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        configuration: true,
        questions: {
          include: {
            answer: {
              include: {
                evaluation: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    const progress = completedInterviews.map((inv) => {
      const answerScores = inv.questions
        .filter((q) => q.answer && q.answer.evaluation)
        .map((q) => {
          const evalData = q.answer!.evaluation!;
          const criteria = (evalData.criteriaScores as unknown as CriterionScoreItem[]) || [];
          return calculateAnswerScore(criteria, q.answer!.isEmpty);
        });

      return {
        id: inv.id,
        date: inv.startedAt ? inv.startedAt.toISOString() : inv.createdAt.toISOString(),
        role: inv.configuration?.role || 'Interview',
        type: inv.configuration?.type || 'TECHNICAL',
        overallScore: calculateOverallScore(answerScores),
      };
    });

    res.status(200).json({
      data: { progress },
    });
  } catch (err) {
    next(err);
  }
}

export async function compareInterviewsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.actor?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { interviewAId, interviewBId } = req.query;
    if (typeof interviewAId !== 'string' || typeof interviewBId !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'interviewAId and interviewBId are required.', 400);
    }

    // Fetch both interviews with ownership check
    const [invA, invB] = await Promise.all([
      prisma.interview.findUnique({
        where: { id: interviewAId },
        include: {
          configuration: true,
          questions: { include: { answer: { include: { evaluation: true } } } },
        },
      }),
      prisma.interview.findUnique({
        where: { id: interviewBId },
        include: {
          configuration: true,
          questions: { include: { answer: { include: { evaluation: true } } } },
        },
      }),
    ]);

    // SEC-1: another user's interview returns 404, not 403
    if (!invA || invA.userId !== userId || !invB || invB.userId !== userId) {
      throw new AppError('NOT_FOUND', 'One or both interviews not found.', 404);
    }

    // Calculate skill breakdowns
    const toAnswers = (inv: typeof invA) =>
      inv!.questions
        .filter((q) => q.answer && q.answer.evaluation)
        .map((q) => ({
          criteriaScores: (q.answer!.evaluation!.criteriaScores as unknown as CriterionScoreItem[]) || [],
          isEmpty: q.answer!.isEmpty,
        }));

    const skillsA = calculateSkillBreakdown(toAnswers(invA));
    const skillsB = calculateSkillBreakdown(toAnswers(invB));

    const comparison = compareInterviewSkills(skillsA, skillsB);

    res.status(200).json({
      data: {
        interviewA: {
          id: invA.id,
          role: invA.configuration?.role,
          date: invA.startedAt || invA.createdAt,
          skills: skillsA,
        },
        interviewB: {
          id: invB.id,
          role: invB.configuration?.role,
          date: invB.startedAt || invB.createdAt,
          skills: skillsB,
        },
        comparison,
      },
    });
  } catch (err) {
    next(err);
  }
}
