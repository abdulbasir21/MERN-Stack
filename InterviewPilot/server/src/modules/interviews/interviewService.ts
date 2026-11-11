import crypto from 'node:crypto';
import type {
  CreateInterviewInput,
  InterviewResponseDto,
  CvSummary,
  JdSummary,
} from '@interviewpilot/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import { validateDocumentsReady } from '../../services/rag/ragService.js';
import { getInterviewPlanGenerator } from '../../services/interview/interviewPlanService.js';
import { getEffectiveQuotaForUser } from '../../services/quota/quotaEngine.js';

export function computeTextHash(text: string): string {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

export async function createInterview(params: {
  userId: string;
  isDemo: boolean;
  input: CreateInterviewInput;
}): Promise<InterviewResponseDto> {
  const { userId, input } = params;

  // 1. Validate Mode vs Documents (SET-1)
  const docIdsToValidate: string[] = [];
  let effectiveCvId: string | null = null;
  let effectiveJdId: string | null = null;

  switch (input.mode) {
    case 'GENERAL':
      // Uploads are optional; GENERAL needs no documents
      break;
    case 'CV_BASED':
      if (!input.cvDocumentId) {
        throw new AppError(
          'DOCUMENT_REQUIRED',
          'CV_BASED mode requires a valid CV document',
          422
        );
      }
      docIdsToValidate.push(input.cvDocumentId);
      effectiveCvId = input.cvDocumentId;
      break;
    case 'JD_BASED':
      if (!input.jdDocumentId) {
        throw new AppError(
          'DOCUMENT_REQUIRED',
          'JD_BASED mode requires a valid Job Description document',
          422
        );
      }
      docIdsToValidate.push(input.jdDocumentId);
      effectiveJdId = input.jdDocumentId;
      break;
    case 'CV_JD':
      if (!input.cvDocumentId || !input.jdDocumentId) {
        throw new AppError(
          'DOCUMENT_REQUIRED',
          'CV_JD mode requires both a CV and a Job Description document',
          422
        );
      }
      docIdsToValidate.push(input.cvDocumentId, input.jdDocumentId);
      effectiveCvId = input.cvDocumentId;
      effectiveJdId = input.jdDocumentId;
      break;
  }

  // Verify documents are READY and belong to the user (RAG-8, SEC-1)
  if (docIdsToValidate.length > 0) {
    await validateDocumentsReady(docIdsToValidate, userId);
  }

  // 2. Load User Quota and Calculate Effective Limits (QTA-9, SET-2, SET-3)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { quota: true },
  });

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  const effectiveQuota = await getEffectiveQuotaForUser(userId);

  // Validate duration against quota limit (QTA-9)
  if (input.durationMinutes > effectiveQuota.maxDurationMinutes) {
    throw new AppError(
      'EXCEEDS_QUOTA_LIMIT',
      `Selected duration (${input.durationMinutes} min) exceeds your plan limit of ${effectiveQuota.maxDurationMinutes} min`,
      422,
      {
        allowedDurationMinutes: effectiveQuota.maxDurationMinutes,
        allowedValues: [15, 30, 45].filter((d) => d <= effectiveQuota.maxDurationMinutes),
      }
    );
  }

  // Calculate question count (SET-3): default floor(durationMinutes / 3) capped by allowed max
  let effectiveQuestions: number;
  if (input.questionCount !== undefined) {
    if (input.questionCount > effectiveQuota.maxQuestionsPerInterview) {
      throw new AppError(
        'EXCEEDS_QUOTA_LIMIT',
        `Selected question count (${input.questionCount}) exceeds your plan limit of ${effectiveQuota.maxQuestionsPerInterview}`,
        422,
        {
          allowedMaxQuestions: effectiveQuota.maxQuestionsPerInterview,
        }
      );
    }
    effectiveQuestions = input.questionCount;
  } else {
    const defaultCalculated = Math.floor(input.durationMinutes / 3);
    effectiveQuestions = Math.min(
      Math.max(3, defaultCalculated),
      effectiveQuota.maxQuestionsPerInterview
    );
  }

  // 3. Concurrency check (QTA-11): at most ONE interview IN_PROGRESS per user
  const activeInterview = await prisma.interview.findFirst({
    where: {
      userId,
      status: 'IN_PROGRESS',
    },
  });

  if (activeInterview) {
    throw new AppError(
      'INTERVIEW_ALREADY_ACTIVE',
      'You already have an interview in progress. Complete or end it before starting a new one.',
      409
    );
  }

  // 4. Fetch document summaries for plan generation (SET-5)
  let cvSummary: CvSummary | null = null;
  let jdSummary: JdSummary | null = null;

  if (effectiveCvId) {
    const cvDoc = await prisma.uploadedDocument.findUnique({
      where: { id: effectiveCvId },
    });
    cvSummary = (cvDoc?.summaryJson as CvSummary) || null;
  }

  if (effectiveJdId) {
    const jdDoc = await prisma.uploadedDocument.findUnique({
      where: { id: effectiveJdId },
    });
    jdSummary = (jdDoc?.summaryJson as JdSummary) || null;
  }

  // 5. Generate plan through withAiUsage (SET-4, QTA-14)
  const planGenerator = getInterviewPlanGenerator();
  const plan = await planGenerator.generatePlan({
    userId,
    mode: input.mode,
    role: input.role,
    experienceLevel: input.experienceLevel,
    type: input.type,
    difficulty: input.difficulty,
    durationMinutes: input.durationMinutes,
    maxQuestions: effectiveQuestions,
    cvSummary,
    jdSummary,
  });

  // 6. Persist Interview + Configuration + First Question in ONE atomic transaction
  const firstQuestionText = plan.firstQuestion;
  const firstQuestionTopic = plan.topics[0] || 'General Introduction';
  const textHash = computeTextHash(firstQuestionText);

  const interview = await prisma.$transaction(
    async (tx) => {
      const newInterview = await tx.interview.create({
      data: {
        userId,
        mode: input.mode,
        status: 'CREATED',
        runtimeState: 'INITIALIZING',
        state: {
          plan,
          difficulty: input.difficulty,
          topicsCovered: [],
          rollingSummary: '',
          pendingQuestion: {
            orderIndex: 1,
            text: firstQuestionText,
            topic: firstQuestionTopic,
            difficulty: input.difficulty,
          },
          listeningMode: 'ANSWER',
        },
        configuration: {
          create: {
            role: input.role,
            experienceLevel: input.experienceLevel,
            type: input.type,
            startDifficulty: input.difficulty,
            durationMinutes: input.durationMinutes,
            maxQuestions: effectiveQuestions,
            cvDocumentId: effectiveCvId,
            jdDocumentId: effectiveJdId,
          },
        },
        questions: {
          create: {
            orderIndex: 1,
            kind: 'MAIN',
            topic: firstQuestionTopic,
            difficulty: input.difficulty,
            text: firstQuestionText,
            textHash,
          },
        },
      },
      include: {
        configuration: true,
        questions: {
          where: { orderIndex: 1 },
        },
      },
    });

    return newInterview;
    },
    { maxWait: 20000, timeout: 30000 }
  );

  const config = interview.configuration!;
  const firstQuestion = interview.questions[0]!;

  return {
    id: interview.id,
    userId: interview.userId,
    mode: interview.mode,
    status: interview.status,
    runtimeState: interview.runtimeState,
    configuration: {
      role: config.role,
      experienceLevel: config.experienceLevel,
      type: config.type,
      startDifficulty: config.startDifficulty,
      durationMinutes: config.durationMinutes,
      maxQuestions: config.maxQuestions,
      cvDocumentId: config.cvDocumentId,
      jdDocumentId: config.jdDocumentId,
    },
    plan,
    firstQuestion: {
      id: firstQuestion.id,
      orderIndex: firstQuestion.orderIndex,
      kind: firstQuestion.kind,
      topic: firstQuestion.topic,
      difficulty: firstQuestion.difficulty,
      text: firstQuestion.text,
    },
    createdAt: interview.createdAt.toISOString(),
  };
}

export async function getInterviewById(params: {
  userId: string;
  interviewId: string;
}): Promise<InterviewResponseDto> {
  const { userId, interviewId } = params;

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      configuration: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!interview || interview.userId !== userId) {
    // SEC-1: another user's interview returns 404
    throw new AppError('NOT_FOUND', 'Interview not found', 404);
  }

  const config = interview.configuration!;
  const firstQuestion = interview.questions[0]!;
  const state = interview.state as { plan: any };

  return {
    id: interview.id,
    userId: interview.userId,
    mode: interview.mode,
    status: interview.status,
    runtimeState: interview.runtimeState,
    configuration: {
      role: config.role,
      experienceLevel: config.experienceLevel,
      type: config.type,
      startDifficulty: config.startDifficulty,
      durationMinutes: config.durationMinutes,
      maxQuestions: config.maxQuestions,
      cvDocumentId: config.cvDocumentId,
      jdDocumentId: config.jdDocumentId,
    },
    plan: state.plan,
    firstQuestion: {
      id: firstQuestion.id,
      orderIndex: firstQuestion.orderIndex,
      kind: firstQuestion.kind,
      topic: firstQuestion.topic,
      difficulty: firstQuestion.difficulty,
      text: firstQuestion.text,
    },
    createdAt: interview.createdAt.toISOString(),
  };
}

export async function listInterviewsForUser(userId: string) {
  const interviews = await prisma.interview.findMany({
    where: { userId },
    include: {
      configuration: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return interviews.map((i) => ({
    id: i.id,
    mode: i.mode,
    status: i.status,
    runtimeState: i.runtimeState,
    role: i.configuration?.role,
    type: i.configuration?.type,
    durationMinutes: i.configuration?.durationMinutes,
    maxQuestions: i.configuration?.maxQuestions,
    createdAt: i.createdAt.toISOString(),
  }));
}
