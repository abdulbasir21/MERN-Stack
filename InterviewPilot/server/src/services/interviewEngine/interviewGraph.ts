import { Annotation } from '@langchain/langgraph';
import type {
  InterviewDifficulty,
  InterviewStatus,
  InterviewRuntimeState,
  InterviewMode,
  QuestionKind,
  ListeningMode,
  EngineDecision,
  AnswerEvaluation,
} from '@interviewpilot/shared';

export interface PendingQuestionState {
  id: string;
  orderIndex: number;
  topic: string;
  difficulty: InterviewDifficulty;
  text: string;
  kind: QuestionKind;
}

export interface QuestionAnswerTurn {
  questionId: string;
  orderIndex: number;
  topic: string;
  difficulty: InterviewDifficulty;
  questionText: string;
  answerText: string;
  isEmpty: boolean;
  evaluation: AnswerEvaluation;
}

// LangGraph Annotation for Interview Pilot Engine
export const InterviewStateAnnotation = Annotation.Root({
  interviewId: Annotation<string>,
  userId: Annotation<string>,
  mode: Annotation<InterviewMode>,
  status: Annotation<InterviewStatus>,
  runtimeState: Annotation<InterviewRuntimeState>,
  listeningMode: Annotation<ListeningMode>,
  currentDifficulty: Annotation<InterviewDifficulty>,
  questionsAsked: Annotation<number>,
  maxQuestions: Annotation<number>,
  durationMinutes: Annotation<number>,
  startedAt: Annotation<string | null>,
  topicsCovered: Annotation<string[]>,
  rollingSummary: Annotation<string>,
  askedQuestionHashes: Annotation<string[]>,
  inquiriesCount: Annotation<number>,
  maxInquiries: Annotation<number>,
  pendingQuestion: Annotation<PendingQuestionState | null>,
  lastEvaluation: Annotation<AnswerEvaluation | null>,
  lastDecision: Annotation<EngineDecision | null>,
  recruiterUtterance: Annotation<string | null>,
  clarificationsOnCurrentTopic: Annotation<number>,
});

export type InterviewGraphStateType = typeof InterviewStateAnnotation.State;
