import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import {
  calculateAnswerScore,
  calculateOverallScore,
  calculateDurationSeconds,
  type CriterionScoreItem,
} from '@interviewpilot/shared';

export async function getUserDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.actor?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    // 1. Fetch user's interviews with evaluations (Zero AI calls - RPT-8)
    const interviews = await prisma.interview.findMany({
      where: {
        userId,
        status: { not: 'CREATED' },
      },
      include: {
        configuration: true,
        report: true,
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

    // 2. Metrics (Section 7 definitions)
    const totalInterviews = interviews.length;
    const completedList = interviews.filter(
      (i) => i.status === 'COMPLETED' || i.status === 'ENDED_EARLY'
    );
    const completedInterviews = completedList.length;

    // Helper to calculate overall score of an interview
    const getScoreForInterview = (inv: typeof interviews[0]): number | null => {
      const answers = inv.questions.filter((q) => q.answer && q.answer.evaluation);
      if (answers.length === 0) return null;
      const scores = answers.map((q) => {
        const criteria = (q.answer!.evaluation!.criteriaScores as unknown as CriterionScoreItem[]) || [];
        return calculateAnswerScore(criteria, q.answer!.isEmpty);
      });
      return calculateOverallScore(scores);
    };

    // Calculate scores of completed interviews
    const completedScores = completedList
      .map((inv) => getScoreForInterview(inv))
      .filter((s): s is number => s !== null);

    const averageScore = calculateOverallScore(completedScores);

    // Recent trend: last 10 completed interviews, oldest to newest (Section 7)
    const last10Completed = [...completedList].slice(0, 10).reverse();
    const recentTrend = last10Completed
      .map((inv) => getScoreForInterview(inv))
      .filter((s): s is number => s !== null);

    // Recent interviews: last 5 interviews
    const recentInterviews = interviews.slice(0, 5).map((inv) => ({
      id: inv.id,
      role: inv.configuration?.role || 'Interview Session',
      type: inv.configuration?.type || 'TECHNICAL',
      date: inv.createdAt.toISOString(),
      durationSeconds: calculateDurationSeconds(inv.startedAt, inv.endedAt),
      overallScore: getScoreForInterview(inv),
      status: inv.status,
      hasReport: inv.report !== null,
    }));

    // Recommendations from the latest saved report (RPT-8)
    const latestReportInterview = interviews.find((i) => i.report && i.report.status === 'READY');
    const latestReport = latestReportInterview?.report;

    const recommendations = latestReport
      ? {
          summary: latestReport.summary,
          strengths: (latestReport.strengths as unknown as string[]) || [],
          weaknesses: (latestReport.weaknesses as unknown as string[]) || [],
          recommendations: (latestReport.recommendations as unknown as string[]) || [],
          studyTopics: (latestReport.studyTopics as unknown as string[]) || [],
        }
      : null;

    res.status(200).json({
      data: {
        isDemo: req.actor?.isDemo || false,
        statistics: {
          totalInterviews,
          completedInterviews,
          averageScore,
          recentTrend,
        },
        recentInterviews,
        recommendations,
      },
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (err) {
    next(err);
  }
}
