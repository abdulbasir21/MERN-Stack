import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import {
  buildInterviewContext,
  decideNext,
  truncateRollingSummary,
  type EngineStateForDecision,
  type QAPair,
} from '../../lib/interviewEngineMath.js';
import type {
  InterviewDifficulty,
  QuestionKind,
  EngineDecision,
  AnswerEvaluation,
} from '@interviewpilot/shared';
import type { PendingQuestionState } from './interviewGraph.js';

export interface EvaluateTurnParams {
  userId: string;
  interviewId: string;
  currentQuestion: PendingQuestionState;
  candidateAnswer: string;
  isEmpty: boolean;
  role: string;
  experienceLevel: string;
  type: string;
  currentDifficulty: InterviewDifficulty;
  cvSummary?: string | null;
  jdSummary?: string | null;
  rollingSummary: string;
  turnsHistory: readonly QAPair[];
  retrievedChunks?: readonly string[];
  questionsAsked: number;
  maxQuestions: number;
  timeRemainingSeconds: number;
  plannedTopics: readonly string[];
  topicsCovered: readonly string[];
  clarificationsOnCurrentTopic: number;
}

export interface GeneratedNextQuestion {
  text: string;
  topic: string;
  kind: QuestionKind;
}

export interface EvaluationResult {
  evaluation: AnswerEvaluation;
  decision: EngineDecision;
  nextDifficulty: InterviewDifficulty;
  updatedRollingSummary: string;
  nextQuestion: GeneratedNextQuestion | null;
  aiCallCount: number;
}

export interface TurnEvaluator {
  evaluateTurn(params: EvaluateTurnParams): Promise<EvaluationResult>;
}

export class MockTurnEvaluator implements TurnEvaluator {
  public callCount = 0;

  async evaluateTurn(params: EvaluateTurnParams): Promise<EvaluationResult> {
    // VOI-4, EVL-4, ENG-7: Empty answers make ZERO AI calls
    if (params.isEmpty || params.candidateAnswer.trim().split(/\s+/).length < 2) {
      const emptyEval: AnswerEvaluation = {
        overallScore: 0,
        criterionScores: [
          {
            criterion: 'Response completeness',
            score: 0,
            feedback: 'No response was provided by candidate.',
          },
        ],
        summaryFeedback: 'Candidate did not answer the question.',
        isEmpty: true,
      };

      const decisionState: EngineStateForDecision = {
        questionsAsked: params.questionsAsked,
        maxQuestions: params.maxQuestions,
        timeRemainingSeconds: params.timeRemainingSeconds,
        currentDifficulty: params.currentDifficulty,
        clarificationsOnCurrentTopic: params.clarificationsOnCurrentTopic,
      };

      const decisionRes = decideNext(decisionState, emptyEval);

      let nextQ: GeneratedNextQuestion | null = null;
      if (decisionRes.decision !== 'CLOSE') {
        const remainingTopics = params.plannedTopics.filter(
          (t) => !params.topicsCovered.includes(t) && t !== params.currentQuestion.topic
        );
        const nextTopic = remainingTopics[0] || 'Technical Follow-up';
        nextQ = {
          text: `Moving forward, let's explore ${nextTopic}. Could you describe your approach in this area?`,
          topic: nextTopic,
          kind: 'MAIN',
        };
      }

      return {
        evaluation: emptyEval,
        decision: decisionRes.decision,
        nextDifficulty: decisionRes.nextDifficulty,
        updatedRollingSummary: truncateRollingSummary(
          params.rollingSummary
            ? `${params.rollingSummary} Candidate passed on "${params.currentQuestion.topic}".`
            : `Candidate passed on "${params.currentQuestion.topic}".`
        ),
        nextQuestion: nextQ,
        aiCallCount: 0, // Zero AI calls!
      };
    }

    // Normal non-empty answer: ONE combined AI evaluation call (ENG-7) through withAiUsage
    return withAiUsage(
      {
        actorUserId: params.userId,
        interviewId: params.interviewId,
        operation: 'ANSWER_EVALUATION',
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens: 350,
        estimatedOutputTokens: 250,
      },
      async () => {
        this.callCount++;

        // Determine mock score based on answer content
        let score = 70;
        const lower = params.candidateAnswer.toLowerCase();
        if (lower.includes('expert') || lower.includes('scale') || lower.includes('distributed') || lower.includes('performance')) {
          score = 85;
        } else if (lower.includes('struggle') || lower.includes('bad') || lower.includes('unsure') || lower.length < 20) {
          score = 35;
        }

        const evaluation: AnswerEvaluation = {
          overallScore: score,
          criterionScores: [
            {
              criterion: 'Technical Depth',
              score,
              feedback: score >= 75 ? 'Thorough understanding demonstrated.' : 'Solid basic knowledge.',
            },
            {
              criterion: 'Communication Clarity',
              score: Math.min(100, score + 5),
              feedback: 'Clear explanation structure.',
            },
          ],
          summaryFeedback:
            score >= 75
              ? 'Excellent answer showing deep familiarity with the topic.'
              : score >= 40
                ? 'Satisfactory response meeting core requirements.'
                : 'Limited response requiring simpler clarification.',
          isEmpty: false,
        };

        const decisionState: EngineStateForDecision = {
          questionsAsked: params.questionsAsked,
          maxQuestions: params.maxQuestions,
          timeRemainingSeconds: params.timeRemainingSeconds,
          currentDifficulty: params.currentDifficulty,
          clarificationsOnCurrentTopic: params.clarificationsOnCurrentTopic,
        };

        const decisionRes = decideNext(decisionState, evaluation);

        let nextQ: GeneratedNextQuestion | null = null;
        if (decisionRes.decision === 'FOLLOW_UP_DEEPER') {
          nextQ = {
            text: `Building on your point regarding ${params.currentQuestion.topic}, how would you handle unexpected failure modes and edge cases?`,
            topic: params.currentQuestion.topic,
            kind: 'FOLLOW_UP',
          };
        } else if (decisionRes.decision === 'CLARIFY_SIMPLER') {
          nextQ = {
            text: `Let's break down ${params.currentQuestion.topic} more simply: what fundamental building blocks would you start with?`,
            topic: params.currentQuestion.topic,
            kind: 'CLARIFICATION',
          };
        } else if (decisionRes.decision === 'NEXT_TOPIC') {
          const remainingTopics = params.plannedTopics.filter(
            (t) => !params.topicsCovered.includes(t) && t !== params.currentQuestion.topic
          );
          const nextTopic = remainingTopics[0] || 'System Scalability & Best Practices';
          nextQ = {
            text: `Thank you. Now let's move on to our next topic: ${nextTopic}. Could you share your experience with this?`,
            topic: nextTopic,
            kind: 'MAIN',
          };
        }

        const newSummary = truncateRollingSummary(
          params.rollingSummary
            ? `${params.rollingSummary} Evaluated ${params.currentQuestion.topic} (Score: ${score}).`
            : `Evaluated ${params.currentQuestion.topic} (Score: ${score}).`
        );

        return {
          result: {
            evaluation,
            decision: decisionRes.decision,
            nextDifficulty: decisionRes.nextDifficulty,
            updatedRollingSummary: newSummary,
            nextQuestion: nextQ,
            aiCallCount: 1,
          },
          usage: {
            inputTokens: 300,
            outputTokens: 200,
          },
        };
      }
    );
  }
}

export class GeminiTurnEvaluator implements TurnEvaluator {
  async evaluateTurn(params: EvaluateTurnParams): Promise<EvaluationResult> {
    // VOI-4, EVL-4, ENG-7: Empty answers make zero AI calls
    if (params.isEmpty || params.candidateAnswer.trim().split(/\s+/).length < 2) {
      const mock = new MockTurnEvaluator();
      return mock.evaluateTurn(params);
    }

    const context = buildInterviewContext({
      role: params.role,
      experienceLevel: params.experienceLevel,
      type: params.type,
      currentDifficulty: params.currentDifficulty,
      cvSummary: params.cvSummary,
      jdSummary: params.jdSummary,
      rollingSummary: params.rollingSummary,
      turnsHistory: params.turnsHistory,
      retrievedChunks: params.retrievedChunks,
      currentQuestion: params.currentQuestion.text,
      currentAnswer: params.candidateAnswer,
    });

    const prompt = `${context}

Respond ONLY with a JSON object matching this schema:
{
  "overallScore": number (0-100),
  "criterionScores": [
    { "criterion": string, "score": number (0-100), "feedback": string }
  ],
  "summaryFeedback": string,
  "rollingSummaryUpdate": string,
  "nextQuestionText": string (or null if interview should close),
  "nextQuestionTopic": string (or null if interview should close)
}`;

    const estimatedInput = Math.max(200, Math.ceil(prompt.length / 4));
    const estimatedOutput = 500;

    return withAiUsage(
      {
        actorUserId: params.userId,
        interviewId: params.interviewId,
        operation: 'ANSWER_EVALUATION',
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens: estimatedInput,
        estimatedOutputTokens: estimatedOutput,
      },
      async () => {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

        // ENG-8: Validated JSON with 1 retry on failure
        let lastErr: unknown;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const resp = await ai.models.generateContent({
              model: env.GEMINI_TEXT_MODEL,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            });

            const parsed = JSON.parse(resp.text || '{}');
            if (typeof parsed.overallScore !== 'number') {
              throw new Error('Missing overallScore in AI output');
            }

            const evaluation: AnswerEvaluation = {
              overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore))),
              criterionScores: Array.isArray(parsed.criterionScores)
                ? parsed.criterionScores
                : [{ criterion: 'Technical evaluation', score: parsed.overallScore, feedback: parsed.summaryFeedback || '' }],
              summaryFeedback: parsed.summaryFeedback || 'Answer evaluated.',
              isEmpty: false,
            };

            const decisionState: EngineStateForDecision = {
              questionsAsked: params.questionsAsked,
              maxQuestions: params.maxQuestions,
              timeRemainingSeconds: params.timeRemainingSeconds,
              currentDifficulty: params.currentDifficulty,
              clarificationsOnCurrentTopic: params.clarificationsOnCurrentTopic,
            };

            const decisionRes = decideNext(decisionState, evaluation);

            let nextQ: GeneratedNextQuestion | null = null;
            if (decisionRes.decision !== 'CLOSE' && parsed.nextQuestionText) {
              const kind: QuestionKind =
                decisionRes.decision === 'FOLLOW_UP_DEEPER'
                  ? 'FOLLOW_UP'
                  : decisionRes.decision === 'CLARIFY_SIMPLER'
                    ? 'CLARIFICATION'
                    : 'MAIN';
              nextQ = {
                text: parsed.nextQuestionText,
                topic: parsed.nextQuestionTopic || params.currentQuestion.topic,
                kind,
              };
            }

            const updatedRollingSummary = truncateRollingSummary(
              parsed.rollingSummaryUpdate ||
                (params.rollingSummary
                  ? `${params.rollingSummary} Evaluated ${params.currentQuestion.topic}.`
                  : `Evaluated ${params.currentQuestion.topic}.`)
            );

            return {
              result: {
                evaluation,
                decision: decisionRes.decision,
                nextDifficulty: decisionRes.nextDifficulty,
                updatedRollingSummary,
                nextQuestion: nextQ,
                aiCallCount: attempt,
              },
              usage: {
                inputTokens: resp.usageMetadata?.promptTokenCount || estimatedInput,
                outputTokens: resp.usageMetadata?.candidatesTokenCount || estimatedOutput,
              },
            };
          } catch (err) {
            lastErr = err;
          }
        }

        // ENG-8: Still invalid after 1 retry -> runtime state ERROR with a retry button
        throw new AppError(
          'EVALUATION_FAILED',
          'AI output format was invalid after retry',
          500,
          { cause: String(lastErr) }
        );
      }
    );
  }
}

let activeTurnEvaluator: TurnEvaluator = new MockTurnEvaluator();

export function getTurnEvaluator(): TurnEvaluator {
  if (process.env.NODE_ENV === 'production' && env.GEMINI_API_KEY) {
    return new GeminiTurnEvaluator();
  }
  return activeTurnEvaluator;
}

export function setTurnEvaluator(evaluator: TurnEvaluator): void {
  activeTurnEvaluator = evaluator;
}

export function resetTurnEvaluator(): void {
  activeTurnEvaluator = new MockTurnEvaluator();
}
