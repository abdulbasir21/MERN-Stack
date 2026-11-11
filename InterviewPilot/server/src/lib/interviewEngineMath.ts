import crypto from 'node:crypto';
import type {
  InterviewDifficulty,
  InterviewStatus,
  InterviewRuntimeState,
  EngineDecision,
  AnswerEvaluation,
} from '@interviewpilot/shared';

// Constants mandated by ENG-3, ENG-6, ENG-9, ENG-10
export const PROMPT_MAX_CHARS = 12_000;
export const ROLLING_SUMMARY_MAX_CHARS = 1_200;
export const ANSWER_MAX_CHARS = 1_500;
export const RETRIEVED_CHUNKS_MAX_CHARS = 3_000;
export const INQUIRY_MAX_REPLY_CHARS = 600;

export const SCORE_THRESHOLD_HIGH = 75;
export const SCORE_THRESHOLD_LOW = 40;
export const TIME_REMAINING_CLOSE_THRESHOLD_SECONDS = 60;
export const LAZY_TIMEOUT_BUFFER_SECONDS = 600; // 10 minutes past maxDuration (ENG-9)

// ENG-2: Interview Status Transitions
export const TERMINAL_STATUSES: ReadonlySet<InterviewStatus> = new Set([
  'COMPLETED',
  'ENDED_EARLY',
  'TIMED_OUT',
  'FAILED',
]);

export const VALID_STATUS_TRANSITIONS: Record<InterviewStatus, readonly InterviewStatus[]> = {
  CREATED: ['IN_PROGRESS', 'FAILED'],
  IN_PROGRESS: ['COMPLETED', 'ENDED_EARLY', 'TIMED_OUT', 'FAILED'],
  COMPLETED: [],
  ENDED_EARLY: [],
  TIMED_OUT: [],
  FAILED: [],
};

export function isTerminalStatus(status: InterviewStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isValidStatusTransition(
  current: InterviewStatus,
  next: InterviewStatus
): boolean {
  if (current === next) return true;
  const allowed = VALID_STATUS_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// ENG-2: Legal Runtime State Transitions
export const VALID_RUNTIME_TRANSITIONS: Record<
  InterviewRuntimeState,
  readonly InterviewRuntimeState[]
> = {
  INITIALIZING: ['RECRUITER_SPEAKING', 'ERROR'],
  RECRUITER_SPEAKING: ['WAITING_FOR_CANDIDATE', 'INTERVIEW_COMPLETED', 'ERROR'],
  WAITING_FOR_CANDIDATE: ['CANDIDATE_LISTENING', 'INTERVIEW_COMPLETED', 'ERROR'],
  CANDIDATE_LISTENING: ['PROCESSING_ANSWER', 'WAITING_FOR_CANDIDATE', 'INTERVIEW_COMPLETED', 'ERROR'],
  PROCESSING_ANSWER: ['AI_THINKING', 'WAITING_FOR_CANDIDATE', 'INTERVIEW_COMPLETED', 'ERROR'],
  AI_THINKING: [
    'GENERATING_NEXT_QUESTION',
    'RECRUITER_SPEAKING',
    'INTERVIEW_COMPLETED',
    'ERROR',
  ],
  GENERATING_NEXT_QUESTION: ['RECRUITER_SPEAKING', 'INTERVIEW_COMPLETED', 'ERROR'],
  GENERATING_FEEDBACK: ['INTERVIEW_COMPLETED', 'ERROR'],
  ERROR: ['WAITING_FOR_CANDIDATE', 'RECRUITER_SPEAKING', 'INTERVIEW_COMPLETED'],
  INTERVIEW_COMPLETED: [],
};

export function isValidRuntimeTransition(
  current: InterviewRuntimeState,
  next: InterviewRuntimeState
): boolean {
  if (current === next) return true;
  const allowed = VALID_RUNTIME_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// Difficulty Stepping Table (ENG-3)
const DIFFICULTY_ORDER: readonly InterviewDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export function stepDifficulty(
  current: InterviewDifficulty,
  direction: 'UP' | 'DOWN'
): InterviewDifficulty {
  const currentIndex = DIFFICULTY_ORDER.indexOf(current);
  if (currentIndex === -1) return current;

  if (direction === 'UP') {
    return DIFFICULTY_ORDER[Math.min(currentIndex + 1, DIFFICULTY_ORDER.length - 1)];
  }
  return DIFFICULTY_ORDER[Math.max(currentIndex - 1, 0)];
}

// ENG-3: decideNext Pure Function
export interface EngineStateForDecision {
  questionsAsked: number;
  maxQuestions: number;
  timeRemainingSeconds: number;
  currentDifficulty: InterviewDifficulty;
  clarificationsOnCurrentTopic?: number;
}

export interface DecisionResult {
  decision: EngineDecision;
  nextDifficulty: InterviewDifficulty;
  reason: string;
}

export function decideNext(
  state: EngineStateForDecision,
  evaluation: AnswerEvaluation
): DecisionResult {
  // 1. Time / Question count limits -> CLOSE (ENG-3)
  if (state.questionsAsked >= state.maxQuestions) {
    return {
      decision: 'CLOSE',
      nextDifficulty: state.currentDifficulty,
      reason: `Max question limit (${state.maxQuestions}) reached`,
    };
  }

  if (state.timeRemainingSeconds <= TIME_REMAINING_CLOSE_THRESHOLD_SECONDS) {
    return {
      decision: 'CLOSE',
      nextDifficulty: state.currentDifficulty,
      reason: `Time remaining (${state.timeRemainingSeconds}s) <= 60s threshold`,
    };
  }

  // 2. Empty answer or candidate cannot answer -> NEXT_TOPIC (never repeat same question, ENG-3)
  if (evaluation.isEmpty || evaluation.overallScore === 0) {
    return {
      decision: 'NEXT_TOPIC',
      nextDifficulty: state.currentDifficulty,
      reason: 'Empty answer or inability to answer; advancing to next topic without repeating question',
    };
  }

  // 3. Score >= 75 -> FOLLOW_UP_DEEPER and raise difficulty one step (max HARD)
  if (evaluation.overallScore >= SCORE_THRESHOLD_HIGH) {
    return {
      decision: 'FOLLOW_UP_DEEPER',
      nextDifficulty: stepDifficulty(state.currentDifficulty, 'UP'),
      reason: `Strong score (${evaluation.overallScore} >= ${SCORE_THRESHOLD_HIGH}); probing deeper with increased difficulty`,
    };
  }

  // 4. Score 40–74 -> NEXT_TOPIC, difficulty unchanged
  if (evaluation.overallScore >= SCORE_THRESHOLD_LOW) {
    return {
      decision: 'NEXT_TOPIC',
      nextDifficulty: state.currentDifficulty,
      reason: `Adequate score (${evaluation.overallScore}); advancing to next planned topic with difficulty unchanged`,
    };
  }

  // 5. Score < 40 -> CLARIFY_SIMPLER and lower difficulty (min EASY), at most once per topic, then NEXT_TOPIC
  const clarifications = state.clarificationsOnCurrentTopic ?? 0;
  if (clarifications < 1) {
    return {
      decision: 'CLARIFY_SIMPLER',
      nextDifficulty: stepDifficulty(state.currentDifficulty, 'DOWN'),
      reason: `Low score (${evaluation.overallScore} < ${SCORE_THRESHOLD_LOW}); offering simpler clarification question`,
    };
  }

  return {
    decision: 'NEXT_TOPIC',
    nextDifficulty: state.currentDifficulty,
    reason: `Low score (${evaluation.overallScore} < ${SCORE_THRESHOLD_LOW}) but topic already clarified once; moving to next topic`,
  };
}

// ENG-4: Question De-duplication Hash
export function computeQuestionHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function isQuestionDuplicate(
  askedHashes: Set<string> | readonly string[],
  newQuestionText: string
): boolean {
  const newHash = computeQuestionHash(newQuestionText);
  if (askedHashes instanceof Set) {
    return askedHashes.has(newHash);
  }
  return askedHashes.includes(newHash);
}

// ENG-9: Server Time Ownership and Calculations
export function calculateElapsedSeconds(
  startedAt: Date | string | null,
  now: Date = new Date()
): number {
  if (!startedAt) return 0;
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  return Math.floor(elapsedMs / 1000);
}

export function calculateRemainingSeconds(
  startedAt: Date | string | null,
  durationMinutes: number,
  now: Date = new Date()
): number {
  if (!startedAt) return durationMinutes * 60;
  const elapsed = calculateElapsedSeconds(startedAt, now);
  const total = durationMinutes * 60;
  return Math.max(0, total - elapsed);
}

export function isPastMaxDuration(
  startedAt: Date | string | null,
  durationMinutes: number,
  now: Date = new Date()
): boolean {
  return calculateRemainingSeconds(startedAt, durationMinutes, now) === 0;
}

export function isPastLazyTimeout(
  startedAt: Date | string | null,
  durationMinutes: number,
  now: Date = new Date()
): boolean {
  if (!startedAt) return false;
  const elapsed = calculateElapsedSeconds(startedAt, now);
  const timeoutSeconds = durationMinutes * 60 + LAZY_TIMEOUT_BUFFER_SECONDS;
  return elapsed >= timeoutSeconds;
}

// ENG-6: Rolling Summary Limiter
export function truncateRollingSummary(
  summary: string,
  maxChars = ROLLING_SUMMARY_MAX_CHARS
): string {
  if (summary.length <= maxChars) return summary;
  return summary.slice(0, maxChars - 3) + '...';
}

// ENG-6: Context Builder with Caps and Rolling Window
export interface QAPair {
  question: string;
  answer: string;
}

export interface ContextBuilderInput {
  systemInstructions?: string;
  role: string;
  experienceLevel: string;
  type: string;
  currentDifficulty: string;
  cvSummary?: string | null;
  jdSummary?: string | null;
  rollingSummary?: string | null;
  turnsHistory: readonly QAPair[];
  retrievedChunks?: readonly string[];
  currentQuestion: string;
  currentAnswer?: string;
}

export function buildInterviewContext(input: ContextBuilderInput): string {
  const sections: string[] = [];

  // 1. Mandatory instructions and tone rule (ENG-5)
  const instructions =
    input.systemInstructions ||
    `You are the AI Recruiter conducting a live mock interview.
Tone Rule: Maintain a respectful, professional, encouraging, and supportive tone at all times. Never embarrass, demean, or discourage the candidate, especially when they struggle or cannot answer.
Evaluation Rule: Assess strictly against realistic industry standards. Do not invent facts or hallucinate capabilities not demonstrated.`;
  sections.push(`### INSTRUCTIONS\n${instructions}`);

  // 2. Interview Configuration
  sections.push(
    `### CONFIGURATION\nTarget Role: ${input.role}\nLevel: ${input.experienceLevel}\nType: ${input.type}\nCurrent Difficulty: ${input.currentDifficulty}`
  );

  // 3. Document Summaries (capped to 1,500 chars each)
  if (input.cvSummary) {
    const cvSnippet = input.cvSummary.slice(0, 1500);
    sections.push(`### CANDIDATE CV SUMMARY\n${cvSnippet}`);
  }
  if (input.jdSummary) {
    const jdSnippet = input.jdSummary.slice(0, 1500);
    sections.push(`### JOB DESCRIPTION SUMMARY\n${jdSnippet}`);
  }

  // 4. Rolling Summary (ENG-6: max 1,200 chars)
  if (input.rollingSummary) {
    const truncatedRolling = truncateRollingSummary(input.rollingSummary);
    sections.push(`### ROLLING INTERVIEW SUMMARY\n${truncatedRolling}`);
  }

  // 5. Retrieved RAG Chunks (RAG-4: max 3,000 chars total)
  if (input.retrievedChunks && input.retrievedChunks.length > 0) {
    let chunksText = input.retrievedChunks.join('\n---\n');
    if (chunksText.length > RETRIEVED_CHUNKS_MAX_CHARS) {
      chunksText = chunksText.slice(0, RETRIEVED_CHUNKS_MAX_CHARS - 3) + '...';
    }
    sections.push(`### RETRIEVED CONTEXT (CV / JD)\n${chunksText}`);
  }

  // 6. Last 3 Question/Answer Pairs (ENG-6: each answer cut to 1,500 chars)
  const recentTurns = input.turnsHistory.slice(-3);
  if (recentTurns.length > 0) {
    const formattedTurns = recentTurns
      .map((t, idx) => {
        const truncatedAnswer =
          t.answer.length > ANSWER_MAX_CHARS
            ? t.answer.slice(0, ANSWER_MAX_CHARS - 3) + '...'
            : t.answer;
        return `Turn ${idx + 1}:\nQ: ${t.question}\nA: ${truncatedAnswer}`;
      })
      .join('\n\n');
    sections.push(`### RECENT TURNS (LAST 3 ONLY)\n${formattedTurns}`);
  }

  // 7. Current Question & Current Answer being evaluated
  sections.push(`### CURRENT QUESTION\n${input.currentQuestion}`);
  if (input.currentAnswer !== undefined) {
    const truncatedCurrentAnswer =
      input.currentAnswer.length > ANSWER_MAX_CHARS
        ? input.currentAnswer.slice(0, ANSWER_MAX_CHARS - 3) + '...'
        : input.currentAnswer;
    sections.push(`### CANDIDATE ANSWER\n${truncatedCurrentAnswer}`);
  }

  const fullPrompt = sections.join('\n\n');

  // Hard prompt ceiling enforcement (PROMPT_MAX_CHARS = 12,000)
  if (fullPrompt.length > PROMPT_MAX_CHARS) {
    return fullPrompt.slice(0, PROMPT_MAX_CHARS - 3) + '...';
  }

  return fullPrompt;
}

// ENG-10: Prompt Template for Candidate Inquiries
export function buildInquiryPrompt(params: {
  pendingQuestion: string;
  inquiry: string;
  retrievedChunks?: readonly string[];
}): string {
  let chunksContext = '';
  if (params.retrievedChunks && params.retrievedChunks.length > 0) {
    chunksContext = `\nRetrieved Relevant Info:\n${params.retrievedChunks.join('\n---\n')}\n`;
  }

  return `You are the AI Recruiter answering a clarification inquiry from the candidate during an interview.

Pending Question the candidate was asked:
"${params.pendingQuestion}"

Candidate Inquiry:
"${params.inquiry}"
${chunksContext}
RULES:
1. Answer the candidate's inquiry clearly and helpfully in at most 600 characters.
2. Under NO circumstance should you reveal the ideal answer, solution, or key evaluation criteria for the pending question.
3. Be professional, supportive, and direct.`;
}
