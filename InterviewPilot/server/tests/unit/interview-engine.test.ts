import { describe, it, expect } from 'vitest';
import {
  decideNext,
  stepDifficulty,
  computeQuestionHash,
  isQuestionDuplicate,
  isValidStatusTransition,
  isTerminalStatus,
  isValidRuntimeTransition,
  calculateElapsedSeconds,
  calculateRemainingSeconds,
  isPastMaxDuration,
  isPastLazyTimeout,
  truncateRollingSummary,
  buildInterviewContext,
  buildInquiryPrompt,
  PROMPT_MAX_CHARS,
  ROLLING_SUMMARY_MAX_CHARS,
  type EngineStateForDecision,
  type QAPair,
} from '../../src/lib/interviewEngineMath.js';
import type {
  AnswerEvaluation,
  InterviewStatus,
} from '@interviewpilot/shared';

describe('Phase 7 Part (a) — Pure Interview Engine Functions', () => {
  describe('ENG-3: decideNext branching logic', () => {
    const baseState: EngineStateForDecision = {
      questionsAsked: 2,
      maxQuestions: 5,
      timeRemainingSeconds: 600,
      currentDifficulty: 'MEDIUM',
      clarificationsOnCurrentTopic: 0,
    };

    const dummyCriteria = [
      { criterion: 'Technical depth', score: 80, feedback: 'Strong answer' },
    ];

    it('returns CLOSE when questionsAsked reaches maxQuestions', () => {
      const state: EngineStateForDecision = { ...baseState, questionsAsked: 5, maxQuestions: 5 };
      const evalResult: AnswerEvaluation = {
        overallScore: 90,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Great answer',
        isEmpty: false,
      };

      const result = decideNext(state, evalResult);
      expect(result.decision).toBe('CLOSE');
    });

    it('returns CLOSE when timeRemaining <= 60 seconds', () => {
      const state: EngineStateForDecision = { ...baseState, timeRemainingSeconds: 59 };
      const evalResult: AnswerEvaluation = {
        overallScore: 85,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Good',
        isEmpty: false,
      };

      const result = decideNext(state, evalResult);
      expect(result.decision).toBe('CLOSE');
    });

    it('returns NEXT_TOPIC when answer is empty without repeating question', () => {
      const evalResult: AnswerEvaluation = {
        overallScore: 0,
        criterionScores: [],
        summaryFeedback: 'Candidate provided no answer',
        isEmpty: true,
      };

      const result = decideNext(baseState, evalResult);
      expect(result.decision).toBe('NEXT_TOPIC');
      expect(result.nextDifficulty).toBe(baseState.currentDifficulty);
    });

    it('returns NEXT_TOPIC when candidate cannot answer (score 0)', () => {
      const evalResult: AnswerEvaluation = {
        overallScore: 0,
        criterionScores: dummyCriteria,
        summaryFeedback: 'I do not know',
        isEmpty: false,
      };

      const result = decideNext(baseState, evalResult);
      expect(result.decision).toBe('NEXT_TOPIC');
    });

    it('returns FOLLOW_UP_DEEPER and steps difficulty UP when score >= 75', () => {
      const evalResult: AnswerEvaluation = {
        overallScore: 80,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Excellent architecture knowledge',
        isEmpty: false,
      };

      const result = decideNext(baseState, evalResult);
      expect(result.decision).toBe('FOLLOW_UP_DEEPER');
      expect(result.nextDifficulty).toBe('HARD');
    });

    it('caps difficulty increase at HARD', () => {
      const hardState: EngineStateForDecision = { ...baseState, currentDifficulty: 'HARD' };
      const evalResult: AnswerEvaluation = {
        overallScore: 95,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Outstanding',
        isEmpty: false,
      };

      const result = decideNext(hardState, evalResult);
      expect(result.decision).toBe('FOLLOW_UP_DEEPER');
      expect(result.nextDifficulty).toBe('HARD');
    });

    it('returns NEXT_TOPIC and keeps difficulty unchanged when score is between 40 and 74', () => {
      const evalResult: AnswerEvaluation = {
        overallScore: 55,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Solid base but lacked depth',
        isEmpty: false,
      };

      const result = decideNext(baseState, evalResult);
      expect(result.decision).toBe('NEXT_TOPIC');
      expect(result.nextDifficulty).toBe('MEDIUM');
    });

    it('returns CLARIFY_SIMPLER and steps difficulty DOWN when score < 40 and first clarification', () => {
      const evalResult: AnswerEvaluation = {
        overallScore: 30,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Struggled with core concept',
        isEmpty: false,
      };

      const result = decideNext(baseState, evalResult);
      expect(result.decision).toBe('CLARIFY_SIMPLER');
      expect(result.nextDifficulty).toBe('EASY');
    });

    it('caps difficulty decrease at EASY', () => {
      const easyState: EngineStateForDecision = { ...baseState, currentDifficulty: 'EASY' };
      const evalResult: AnswerEvaluation = {
        overallScore: 25,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Incorrect answer',
        isEmpty: false,
      };

      const result = decideNext(easyState, evalResult);
      expect(result.decision).toBe('CLARIFY_SIMPLER');
      expect(result.nextDifficulty).toBe('EASY');
    });

    it('returns NEXT_TOPIC when score < 40 if topic was already clarified once', () => {
      const alreadyClarifiedState: EngineStateForDecision = {
        ...baseState,
        clarificationsOnCurrentTopic: 1,
      };
      const evalResult: AnswerEvaluation = {
        overallScore: 25,
        criterionScores: dummyCriteria,
        summaryFeedback: 'Still struggled after clarification',
        isEmpty: false,
      };

      const result = decideNext(alreadyClarifiedState, evalResult);
      expect(result.decision).toBe('NEXT_TOPIC');
      expect(result.nextDifficulty).toBe(baseState.currentDifficulty);
    });
  });

  describe('ENG-3: Difficulty Stepping', () => {
    it('steps UP properly up to HARD', () => {
      expect(stepDifficulty('EASY', 'UP')).toBe('MEDIUM');
      expect(stepDifficulty('MEDIUM', 'UP')).toBe('HARD');
      expect(stepDifficulty('HARD', 'UP')).toBe('HARD');
    });

    it('steps DOWN properly down to EASY', () => {
      expect(stepDifficulty('HARD', 'DOWN')).toBe('MEDIUM');
      expect(stepDifficulty('MEDIUM', 'DOWN')).toBe('EASY');
      expect(stepDifficulty('EASY', 'DOWN')).toBe('EASY');
    });
  });

  describe('ENG-4: Question De-duplication Hash', () => {
    it('generates identical hashes ignoring casing, punctuation, and extra whitespace', () => {
      const q1 = 'What is the Event Loop in Node.js?';
      const q2 = '  what is the event loop in nodejs   ';
      const q3 = 'What is the Event Loop in Node.js!';

      const h1 = computeQuestionHash(q1);
      const h2 = computeQuestionHash(q2);
      const h3 = computeQuestionHash(q3);

      expect(h1).toBe(h2);
      expect(h2).toBe(h3);
    });

    it('detects duplicate question against a set or list of hashes', () => {
      const asked = [computeQuestionHash('Explain React useEffect lifecycle.')];
      expect(isQuestionDuplicate(asked, 'explain react useeffect lifecycle')).toBe(true);
      expect(isQuestionDuplicate(asked, 'Explain React useMemo hook.')).toBe(false);
    });
  });

  describe('ENG-2: Status and Runtime State Transitions', () => {
    it('validates allowed status transitions', () => {
      expect(isValidStatusTransition('CREATED', 'IN_PROGRESS')).toBe(true);
      expect(isValidStatusTransition('CREATED', 'FAILED')).toBe(true);
      expect(isValidStatusTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
      expect(isValidStatusTransition('IN_PROGRESS', 'ENDED_EARLY')).toBe(true);
      expect(isValidStatusTransition('IN_PROGRESS', 'TIMED_OUT')).toBe(true);
      expect(isValidStatusTransition('IN_PROGRESS', 'FAILED')).toBe(true);
      expect(isValidStatusTransition('IN_PROGRESS', 'IN_PROGRESS')).toBe(true);
    });

    it('rejects illegal status transitions', () => {
      expect(isValidStatusTransition('CREATED', 'COMPLETED')).toBe(false);
      expect(isValidStatusTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
      expect(isValidStatusTransition('ENDED_EARLY', 'IN_PROGRESS')).toBe(false);
      expect(isValidStatusTransition('TIMED_OUT', 'IN_PROGRESS')).toBe(false);
      expect(isValidStatusTransition('FAILED', 'IN_PROGRESS')).toBe(false);
    });

    it('identifies terminal statuses as immutable', () => {
      const terminalStatuses: InterviewStatus[] = ['COMPLETED', 'ENDED_EARLY', 'TIMED_OUT', 'FAILED'];
      for (const st of terminalStatuses) {
        expect(isTerminalStatus(st)).toBe(true);
      }
      expect(isTerminalStatus('CREATED')).toBe(false);
      expect(isTerminalStatus('IN_PROGRESS')).toBe(false);
    });

    it('validates runtime transitions strictly per ENG-2', () => {
      expect(isValidRuntimeTransition('INITIALIZING', 'RECRUITER_SPEAKING')).toBe(true);
      expect(isValidRuntimeTransition('INITIALIZING', 'ERROR')).toBe(true);
      expect(isValidRuntimeTransition('INITIALIZING', 'WAITING_FOR_CANDIDATE')).toBe(false);

      expect(isValidRuntimeTransition('RECRUITER_SPEAKING', 'WAITING_FOR_CANDIDATE')).toBe(true);
      expect(isValidRuntimeTransition('RECRUITER_SPEAKING', 'INTERVIEW_COMPLETED')).toBe(true);
      expect(isValidRuntimeTransition('RECRUITER_SPEAKING', 'CANDIDATE_LISTENING')).toBe(false);

      expect(isValidRuntimeTransition('WAITING_FOR_CANDIDATE', 'CANDIDATE_LISTENING')).toBe(true);
      expect(isValidRuntimeTransition('CANDIDATE_LISTENING', 'PROCESSING_ANSWER')).toBe(true);
      expect(isValidRuntimeTransition('PROCESSING_ANSWER', 'AI_THINKING')).toBe(true);
      expect(isValidRuntimeTransition('AI_THINKING', 'GENERATING_NEXT_QUESTION')).toBe(true);
      expect(isValidRuntimeTransition('GENERATING_NEXT_QUESTION', 'RECRUITER_SPEAKING')).toBe(true);

      // Error retry routes
      expect(isValidRuntimeTransition('ERROR', 'WAITING_FOR_CANDIDATE')).toBe(true);
      expect(isValidRuntimeTransition('ERROR', 'RECRUITER_SPEAKING')).toBe(true);
      expect(isValidRuntimeTransition('ERROR', 'INTERVIEW_COMPLETED')).toBe(true);
    });
  });

  describe('ENG-9: Time Calculations', () => {
    it('calculates elapsed and remaining seconds correctly', () => {
      const now = new Date('2026-11-11T10:15:00Z');
      const startedAt = new Date('2026-11-11T10:05:00Z'); // 10 minutes ago = 600s

      const elapsed = calculateElapsedSeconds(startedAt, now);
      expect(elapsed).toBe(600);

      const remaining15 = calculateRemainingSeconds(startedAt, 15, now);
      expect(remaining15).toBe(300); // 15*60 - 600 = 300s

      const remaining10 = calculateRemainingSeconds(startedAt, 10, now);
      expect(remaining10).toBe(0); // 10*60 - 600 = 0s
      expect(isPastMaxDuration(startedAt, 10, now)).toBe(true);
      expect(isPastMaxDuration(startedAt, 15, now)).toBe(false);
    });

    it('identifies lazy timeout when past maxDuration + 10 minutes (600s)', () => {
      const now = new Date('2026-11-11T10:26:00Z');
      const startedAt = new Date('2026-11-11T10:00:00Z'); // 26 min ago = 1560s
      // 15 min duration + 10 min buffer = 25 min (1500s)

      expect(isPastLazyTimeout(startedAt, 15, now)).toBe(true);

      const earlierNow = new Date('2026-11-11T10:20:00Z'); // 20 min ago < 25 min
      expect(isPastLazyTimeout(startedAt, 15, earlierNow)).toBe(false);
    });
  });

  describe('ENG-6: Context Builder & 50-turn cap fixture', () => {
    it('truncates rolling summary to 1,200 characters', () => {
      const longSummary = 'A'.repeat(2000);
      const truncated = truncateRollingSummary(longSummary);
      expect(truncated.length).toBeLessThanOrEqual(ROLLING_SUMMARY_MAX_CHARS);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('50-turn fixture stays under PROMPT_MAX_CHARS (12,000 chars)', () => {
      // Simulate 50 extensive turns
      const turns: QAPair[] = [];
      for (let i = 1; i <= 50; i++) {
        turns.push({
          question: `Detailed question ${i}: How would you optimize the distributed cache and write-behind replication across cluster nodes?`,
          answer: `Candidate answer ${i}: ` + 'Here is a comprehensive breakdown of my caching strategy. '.repeat(60), // ~3600 chars each!
        });
      }

      const hugeRollingSummary = 'In this interview we evaluated system design. '.repeat(100);
      const hugeCv = 'Experienced software architect with skills: TypeScript, Node.js, Distributed Systems. '.repeat(50);
      const hugeJd = 'Looking for Principal Backend Engineer to build high-scale cloud platforms. '.repeat(50);
      const chunks = [
        'Chunk 1: Prior work on payment ledger with high availability. '.repeat(30),
        'Chunk 2: Kafka messaging pipeline details and partitioning scheme. '.repeat(30),
      ];

      const prompt = buildInterviewContext({
        role: 'Principal Backend Engineer',
        experienceLevel: 'EXPERIENCED',
        type: 'TECHNICAL',
        currentDifficulty: 'HARD',
        cvSummary: hugeCv,
        jdSummary: hugeJd,
        rollingSummary: hugeRollingSummary,
        turnsHistory: turns,
        retrievedChunks: chunks,
        currentQuestion: 'Could you explain how partition rebalancing works under load?',
        currentAnswer: 'When a new consumer node joins, the group coordinator reassigns partitions. '.repeat(50),
      });

      // Strict ENG-6 constraint: Total context must NEVER exceed PROMPT_MAX_CHARS (12,000)
      expect(prompt.length).toBeLessThanOrEqual(PROMPT_MAX_CHARS);

      // Verify that only the last 3 turns are included in recent turns
      expect(prompt).toContain('Turn 1:');
      expect(prompt).toContain('Turn 2:');
      expect(prompt).toContain('Turn 3:');
      expect(prompt).not.toContain('Turn 4:');
      expect(prompt).toContain('Detailed question 50:');
      expect(prompt).not.toContain('Detailed question 10:');
    });
  });

  describe('ENG-5 & ENG-10: Prompt tone rules and inquiry constraints', () => {
    it('context builder includes respectful, encouraging tone rule (ENG-5)', () => {
      const prompt = buildInterviewContext({
        role: 'Full Stack Engineer',
        experienceLevel: 'INTERMEDIATE',
        type: 'TECHNICAL',
        currentDifficulty: 'MEDIUM',
        turnsHistory: [],
        currentQuestion: 'Tell me about React concurrency.',
      });

      expect(prompt.toLowerCase()).toContain('respectful');
      expect(prompt.toLowerCase()).toContain('never embarrass');
      expect(prompt.toLowerCase()).toContain('discourage');
    });

    it('inquiry prompt explicitly forbids revealing the ideal answer and caps at 600 chars (ENG-10)', () => {
      const inquiryPrompt = buildInquiryPrompt({
        pendingQuestion: 'How would you design a distributed rate limiter using Redis token buckets?',
        inquiry: 'Can you clarify if the limiter should be per user or per IP address?',
        retrievedChunks: ['Redis supports atomic Lua scripts for token bucket updates.'],
      });

      expect(inquiryPrompt).toContain('600 characters');
      expect(inquiryPrompt).toContain('reveal the ideal answer');
      expect(inquiryPrompt).toContain('Redis token buckets');
      expect(inquiryPrompt).toContain('per user or per IP');
    });
  });
});
