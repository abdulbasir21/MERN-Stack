import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/errors.js';
import {
  calculateElapsedSeconds,
  calculateRemainingSeconds,
  isPastLazyTimeout,
  computeQuestionHash,
  isQuestionDuplicate,
  isTerminalStatus,
  type QAPair,
} from '../../lib/interviewEngineMath.js';
import { getTurnEvaluator } from '../../services/interviewEngine/evaluationService.js';
import { getInquiryAnswerer } from '../../services/interviewEngine/inquiryService.js';
import { getEffectiveQuotaForUser } from '../../services/quota/quotaEngine.js';
import type {
  InterviewStateDto,
  SubmitAnswerInput,
  SubmitInquiryInput,
  InterviewDifficulty,
  AnswerEvaluation,
  EngineDecision,
  InterviewPlan,
} from '@interviewpilot/shared';
import type { PendingQuestionState } from '../../services/interviewEngine/interviewGraph.js';

interface StoredInterviewState {
  plan: InterviewPlan;
  currentDifficulty: InterviewDifficulty;
  topicsCovered: string[];
  rollingSummary: string;
  askedQuestionHashes?: string[];
  inquiriesCount?: number;
  pendingQuestion: PendingQuestionState | null;
  listeningMode?: 'ANSWER' | 'QUESTION';
  recruiterUtterance?: string | null;
  lastEvaluation?: AnswerEvaluation | null;
  lastDecision?: EngineDecision | null;
  clarificationsOnCurrentTopic?: number;
}

export async function getInterviewOrThrow(
  interviewId: string,
  userId: string
) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      configuration: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { answer: { include: { evaluation: true } } },
      },
    },
  });

  if (!interview || interview.userId !== userId) {
    // SEC-1: Another user's resource returns 404, not 403
    throw new AppError('NOT_FOUND', 'Interview not found.', 404);
  }

  // Lazy timeout check (ENG-9)
  if (
    interview.status === 'IN_PROGRESS' &&
    interview.startedAt &&
    interview.configuration
  ) {
    if (
      isPastLazyTimeout(
        interview.startedAt,
        interview.configuration.durationMinutes,
        new Date()
      )
    ) {
      const updated = await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: 'TIMED_OUT',
          runtimeState: 'INTERVIEW_COMPLETED',
          endedAt: new Date(),
          endReason: 'TIME_LIMIT',
        },
        include: {
          configuration: true,
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: { answer: { include: { evaluation: true } } },
          },
        },
      });
      return updated;
    }
  }

  return interview;
}

export function formatInterviewStateDto(
  interview: Awaited<ReturnType<typeof getInterviewOrThrow>>,
  effectiveMaxInquiries = 3
): InterviewStateDto {
  const state = interview.state as unknown as StoredInterviewState;
  const duration = interview.configuration?.durationMinutes ?? 15;
  const maxQuestions = interview.configuration?.maxQuestions ?? 5;
  const elapsedSeconds = calculateElapsedSeconds(interview.startedAt, new Date());
  const remainingSeconds = calculateRemainingSeconds(interview.startedAt, duration, new Date());

  const currentQ = state.pendingQuestion
    ? {
        id: state.pendingQuestion.id,
        orderIndex: state.pendingQuestion.orderIndex,
        kind: state.pendingQuestion.kind,
        topic: state.pendingQuestion.topic,
        difficulty: state.pendingQuestion.difficulty,
        text: state.pendingQuestion.text,
      }
    : null;

  return {
    id: interview.id,
    status: interview.status,
    runtimeState: interview.runtimeState,
    listeningMode: state.listeningMode || 'ANSWER',
    elapsedSeconds,
    remainingSeconds,
    currentQuestion: currentQ,
    questionsAsked: interview.questions.filter((q) => q.answer !== null).length,
    maxQuestions,
    inquiriesCount: state.inquiriesCount || 0,
    maxInquiries: effectiveMaxInquiries,
    topicsCovered: state.topicsCovered || [],
    currentDifficulty: state.currentDifficulty || interview.configuration?.startDifficulty || 'MEDIUM',
    recruiterUtterance: state.recruiterUtterance || null,
    isTerminal: isTerminalStatus(interview.status),
  };
}

export async function startInterviewEngine(params: {
  interviewId: string;
  userId: string;
  clientRequestId?: string;
}): Promise<InterviewStateDto> {
  const { interviewId, userId } = params;
  const interview = await getInterviewOrThrow(interviewId, userId);

  // If already IN_PROGRESS and repeated within idempotency window, return current state (QTA-12)
  if (interview.status === 'IN_PROGRESS') {
    return formatInterviewStateDto(interview);
  }

  if (interview.status !== 'CREATED') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot start interview with status ${interview.status}`,
      400
    );
  }

  // DEM-2: Verify live demo is enabled if user is demo
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isDemo) {
    const liveDemoSetting = await prisma.applicationSetting.findUnique({
      where: { key: 'liveDemoEnabled' },
    });
    if (liveDemoSetting && liveDemoSetting.value === false) {
      throw new AppError('DEMO_LIVE_DISABLED', 'Live demo interviews are currently disabled by administrator.', 403);
    }
  }

  // QTA-11: Verify user has NO OTHER active interview in IN_PROGRESS status
  const existingActive = await prisma.interview.findFirst({
    where: {
      userId,
      status: 'IN_PROGRESS',
      id: { not: interviewId },
    },
  });

  if (existingActive) {
    throw new AppError(
      'INTERVIEW_ALREADY_ACTIVE',
      'You already have an active interview in progress. Complete or end it first.',
      409
    );
  }

  const state = interview.state as unknown as StoredInterviewState;
  const firstQuestion = interview.questions[0];

  const firstQuestionState: PendingQuestionState = {
    id: firstQuestion.id,
    orderIndex: firstQuestion.orderIndex,
    topic: firstQuestion.topic,
    difficulty: firstQuestion.difficulty,
    text: firstQuestion.text,
    kind: firstQuestion.kind,
  };

  const greetingUtterance = `${state.plan.greeting} ${firstQuestion.text}`;
  const now = new Date();

  const updatedState: StoredInterviewState = {
    ...state,
    pendingQuestion: firstQuestionState,
    recruiterUtterance: greetingUtterance,
    askedQuestionHashes: [computeQuestionHash(firstQuestion.text)],
    inquiriesCount: 0,
    topicsCovered: [],
    clarificationsOnCurrentTopic: 0,
  };

  const updatedInterview = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: 'IN_PROGRESS',
      runtimeState: 'RECRUITER_SPEAKING',
      startedAt: now,
      state: updatedState as unknown as object,
    },
    include: {
      configuration: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { answer: { include: { evaluation: true } } },
      },
    },
  });

  return formatInterviewStateDto(updatedInterview);
}

export async function submitCandidateAnswer(params: {
  interviewId: string;
  userId: string;
  input: SubmitAnswerInput;
  clientRequestId?: string;
}): Promise<{
  state: InterviewStateDto;
  evaluation: AnswerEvaluation;
  decision: EngineDecision;
  nextQuestionText: string | null;
}> {
  const { interviewId, userId, input, clientRequestId } = params;
  const interview = await getInterviewOrThrow(interviewId, userId);

  if (interview.status !== 'IN_PROGRESS') {
    throw new AppError(
      'INTERVIEW_NOT_ACTIVE',
      `Cannot submit answer to interview with status ${interview.status}`,
      400
    );
  }

  // QTA-12: Idempotency duplicate check on clientRequestId
  if (clientRequestId) {
    const existingAnswer = await prisma.candidateAnswer.findUnique({
      where: {
        interviewId_clientRequestId: {
          interviewId,
          clientRequestId,
        },
      },
      include: { evaluation: true },
    });

    if (existingAnswer && existingAnswer.evaluation) {
      // Return previous result with no new AI call
      const stateDto = formatInterviewStateDto(interview);
      const evalData = existingAnswer.evaluation;
      return {
        state: stateDto,
        evaluation: {
          overallScore: evalData.overallScore,
          criterionScores: (evalData.criteriaScores as unknown as AnswerEvaluation['criterionScores']) || [],
          summaryFeedback: evalData.correct || 'Answer evaluated.',
          isEmpty: existingAnswer.isEmpty,
        },
        decision: (interview.state as unknown as StoredInterviewState).lastDecision || 'NEXT_TOPIC',
        nextQuestionText: (interview.state as unknown as StoredInterviewState).pendingQuestion?.text || null,
      };
    }
  }

  const state = interview.state as unknown as StoredInterviewState;
  const currentPending = state.pendingQuestion;

  if (!currentPending) {
    throw new AppError('INVALID_STATE', 'No pending question found to answer.', 400);
  }

  const duration = interview.configuration?.durationMinutes ?? 15;
  const maxQuestions = interview.configuration?.maxQuestions ?? 5;
  const remainingSeconds = calculateRemainingSeconds(interview.startedAt, duration, new Date());

  // Build turns history for context builder
  const turnsHistory: QAPair[] = interview.questions
    .filter((q) => q.answer !== null)
    .map((q) => ({
      question: q.text,
      answer: q.answer!.transcript,
    }));

  // Fetch document summaries if needed
  let cvSummaryText: string | null = null;
  let jdSummaryText: string | null = null;
  if (interview.configuration?.cvDocumentId) {
    const doc = await prisma.uploadedDocument.findUnique({
      where: { id: interview.configuration.cvDocumentId },
    });
    if (doc?.summaryJson) cvSummaryText = JSON.stringify(doc.summaryJson);
  }
  if (interview.configuration?.jdDocumentId) {
    const doc = await prisma.uploadedDocument.findUnique({
      where: { id: interview.configuration.jdDocumentId },
    });
    if (doc?.summaryJson) jdSummaryText = JSON.stringify(doc.summaryJson);
  }

  const evaluator = getTurnEvaluator();
  const evalResult = await evaluator.evaluateTurn({
    userId,
    interviewId,
    currentQuestion: currentPending,
    candidateAnswer: input.transcript,
    isEmpty: input.isEmpty,
    role: interview.configuration?.role ?? 'Software Engineer',
    experienceLevel: interview.configuration?.experienceLevel ?? 'INTERMEDIATE',
    type: interview.configuration?.type ?? 'TECHNICAL',
    currentDifficulty: state.currentDifficulty || 'MEDIUM',
    cvSummary: cvSummaryText,
    jdSummary: jdSummaryText,
    rollingSummary: state.rollingSummary || '',
    turnsHistory,
    questionsAsked: turnsHistory.length + 1,
    maxQuestions,
    timeRemainingSeconds: remainingSeconds,
    plannedTopics: state.plan.topics,
    topicsCovered: state.topicsCovered || [],
    clarificationsOnCurrentTopic: state.clarificationsOnCurrentTopic || 0,
  });

  // Atomic database update in ONE transaction (MASTER_PROMPT §9 #6 & #7)
  const isClose = evalResult.decision === 'CLOSE';
  const askedHashes = new Set(state.askedQuestionHashes || []);
  askedHashes.add(computeQuestionHash(currentPending.text));

  let newPendingQuestionState: PendingQuestionState | null = null;

  await prisma.$transaction(
    async (tx) => {
      // 1. Create CandidateAnswer
      const answer = await tx.candidateAnswer.create({
        data: {
          interviewId,
          questionId: currentPending.id,
          transcript: input.transcript,
          isEmpty: input.isEmpty || evalResult.evaluation.isEmpty,
          durationSeconds: input.durationSeconds ?? null,
          clientRequestId: clientRequestId ?? null,
        },
      });

      // 2. Create AnswerEvaluation
      await tx.answerEvaluation.create({
        data: {
          answerId: answer.id,
          overallScore: evalResult.evaluation.overallScore,
          criteriaScores: evalResult.evaluation.criterionScores as unknown as object,
          correct: evalResult.evaluation.summaryFeedback,
        },
      });

      // 3. If CLOSE, complete the interview
      if (isClose) {
        await tx.interview.update({
          where: { id: interviewId },
          data: {
            status: 'COMPLETED',
            runtimeState: 'INTERVIEW_COMPLETED',
            endedAt: new Date(),
            endReason: 'QUESTIONS_COMPLETED',
            state: {
              ...state,
              pendingQuestion: null,
              lastEvaluation: evalResult.evaluation,
              lastDecision: 'CLOSE',
              rollingSummary: evalResult.updatedRollingSummary,
              recruiterUtterance:
                'Thank you so much for your time and thoughtful responses! This concludes our interview rehearsal today.',
            } as unknown as object,
          },
        });
      } else if (evalResult.nextQuestion) {
        // 4. Verify question deduplication (ENG-4)
        let qText = evalResult.nextQuestion.text;
        if (isQuestionDuplicate(askedHashes, qText)) {
          // Append topic differentiation to ensure unique question text
          qText = `${qText} Specifically highlighting architectural trade-offs.`;
        }
        const textHash = computeQuestionHash(qText);
        askedHashes.add(textHash);

        const nextOrderIndex = currentPending.orderIndex + 1;
        const newQuestionRow = await tx.interviewQuestion.create({
          data: {
            interviewId,
            orderIndex: nextOrderIndex,
            kind: evalResult.nextQuestion.kind,
            topic: evalResult.nextQuestion.topic,
            difficulty: evalResult.nextDifficulty,
            text: qText,
            textHash,
          },
        });

        newPendingQuestionState = {
          id: newQuestionRow.id,
          orderIndex: newQuestionRow.orderIndex,
          kind: newQuestionRow.kind,
          topic: newQuestionRow.topic,
          difficulty: newQuestionRow.difficulty,
          text: newQuestionRow.text,
        };

        const updatedTopicsCovered = [...(state.topicsCovered || [])];
        if (!updatedTopicsCovered.includes(currentPending.topic)) {
          updatedTopicsCovered.push(currentPending.topic);
        }

        const clarifications =
          evalResult.decision === 'CLARIFY_SIMPLER'
            ? (state.clarificationsOnCurrentTopic || 0) + 1
            : 0;

        await tx.interview.update({
          where: { id: interviewId },
          data: {
            runtimeState: 'RECRUITER_SPEAKING',
            state: {
              ...state,
              currentDifficulty: evalResult.nextDifficulty,
              pendingQuestion: newPendingQuestionState,
              lastEvaluation: evalResult.evaluation,
              lastDecision: evalResult.decision,
              rollingSummary: evalResult.updatedRollingSummary,
              askedQuestionHashes: Array.from(askedHashes),
              topicsCovered: updatedTopicsCovered,
              clarificationsOnCurrentTopic: clarifications,
              recruiterUtterance: qText,
            } as unknown as object,
          },
        });
      }
    },
    { maxWait: 30000, timeout: 30000 }
  );

  const freshInterview = await getInterviewOrThrow(interviewId, userId);
  const stateDto = formatInterviewStateDto(freshInterview);

  return {
    state: stateDto,
    evaluation: evalResult.evaluation,
    decision: evalResult.decision,
    nextQuestionText: newPendingQuestionState ? (newPendingQuestionState as PendingQuestionState).text : null,
  };
}

export async function submitCandidateInquiry(params: {
  interviewId: string;
  userId: string;
  input: SubmitInquiryInput;
  clientRequestId?: string;
}): Promise<{
  state: InterviewStateDto;
  reply: string;
}> {
  const { interviewId, userId, input, clientRequestId } = params;
  const interview = await getInterviewOrThrow(interviewId, userId);

  if (interview.status !== 'IN_PROGRESS') {
    throw new AppError(
      'INTERVIEW_NOT_ACTIVE',
      `Cannot submit inquiry to interview with status ${interview.status}`,
      400
    );
  }

  // QTA-12: Idempotency check on clientRequestId
  if (clientRequestId) {
    const existingInquiry = await prisma.candidateInquiry.findUnique({
      where: {
        interviewId_clientRequestId: {
          interviewId,
          clientRequestId,
        },
      },
    });

    if (existingInquiry) {
      const stateDto = formatInterviewStateDto(interview);
      return {
        state: stateDto,
        reply: existingInquiry.reply,
      };
    }
  }

  const userQuota = await getEffectiveQuotaForUser(userId);
  const state = interview.state as unknown as StoredInterviewState;
  const currentInquiries = state.inquiriesCount || 0;

  // ENG-10: Candidate inquiry quota check
  if (currentInquiries >= userQuota.maxInquiriesPerInterview) {
    throw new AppError(
      'INQUIRY_LIMIT_REACHED',
      `You have reached the maximum allowed inquiries (${userQuota.maxInquiriesPerInterview}) for this interview rehearsal.`,
      422
    );
  }

  const currentPending = state.pendingQuestion;
  if (!currentPending) {
    throw new AppError('INVALID_STATE', 'No active question found to clarify.', 400);
  }

  const docIds: string[] = [];
  if (interview.configuration?.cvDocumentId) docIds.push(interview.configuration.cvDocumentId);
  if (interview.configuration?.jdDocumentId) docIds.push(interview.configuration.jdDocumentId);

  const inquiryAnswerer = getInquiryAnswerer();
  const reply = await inquiryAnswerer.answerInquiry({
    userId,
    interviewId,
    pendingQuestion: currentPending.text,
    inquiry: input.inquiry,
    interviewDocIds: docIds,
  });

  // Record inquiry and update state in transaction (MASTER_PROMPT §9)
  await prisma.$transaction(
    async (tx) => {
      await tx.candidateInquiry.create({
        data: {
          interviewId,
          questionId: currentPending.id,
          transcript: input.inquiry,
          reply,
          clientRequestId: clientRequestId ?? null,
        },
      });

      await tx.interview.update({
        where: { id: interviewId },
        data: {
          runtimeState: 'RECRUITER_SPEAKING',
          state: {
            ...state,
            inquiriesCount: currentInquiries + 1,
            recruiterUtterance: reply,
            // Pending question and difficulty are untouched (ENG-10)!
          } as unknown as object,
        },
      });
    },
    { maxWait: 30000, timeout: 30000 }
  );

  const freshInterview = await getInterviewOrThrow(interviewId, userId);
  return {
    state: formatInterviewStateDto(freshInterview, userQuota.maxInquiriesPerInterview),
    reply,
  };
}

export async function endInterviewEarly(params: {
  interviewId: string;
  userId: string;
}): Promise<InterviewStateDto> {
  const { interviewId, userId } = params;
  const interview = await getInterviewOrThrow(interviewId, userId);

  if (isTerminalStatus(interview.status)) {
    return formatInterviewStateDto(interview);
  }

  const updatedInterview = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: 'ENDED_EARLY',
      runtimeState: 'INTERVIEW_COMPLETED',
      endedAt: new Date(),
      endReason: 'USER_ENDED',
    },
    include: {
      configuration: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { answer: { include: { evaluation: true } } },
      },
    },
  });

  return formatInterviewStateDto(updatedInterview);
}

export async function retryInterviewErrorState(params: {
  interviewId: string;
  userId: string;
}): Promise<InterviewStateDto> {
  const { interviewId, userId } = params;
  const interview = await getInterviewOrThrow(interviewId, userId);

  if (interview.runtimeState !== 'ERROR') {
    return formatInterviewStateDto(interview);
  }

  const updatedInterview = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      runtimeState: 'WAITING_FOR_CANDIDATE',
    },
    include: {
      configuration: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { answer: { include: { evaluation: true } } },
      },
    },
  });

  return formatInterviewStateDto(updatedInterview);
}
