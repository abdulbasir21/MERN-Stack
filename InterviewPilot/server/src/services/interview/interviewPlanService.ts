import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import type {
  InterviewPlan,
  InterviewMode,
  InterviewType,
  InterviewDifficulty,
  ExperienceLevel,
  CvSummary,
  JdSummary,
} from '@interviewpilot/shared';

export interface PlanGenerationContext {
  userId: string;
  mode: InterviewMode;
  role: string;
  experienceLevel: ExperienceLevel;
  type: InterviewType;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
  maxQuestions: number;
  cvSummary?: CvSummary | null;
  jdSummary?: JdSummary | null;
}

export interface InterviewPlanGenerator {
  generatePlan(ctx: PlanGenerationContext): Promise<InterviewPlan>;
}

export class MockInterviewPlanGenerator implements InterviewPlanGenerator {
  public callCount = 0;

  async generatePlan(ctx: PlanGenerationContext): Promise<InterviewPlan> {
    return withAiUsage(
      {
        actorUserId: ctx.userId,
        operation: 'INTERVIEW_PLAN',
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens: 200,
        estimatedOutputTokens: 400,
        consumeInterview: true, // QTA-14: increments interviewsCreated
      },
      async () => {
        this.callCount++;

        // In CV modes (SET-5), at least one topic must reference an item from the CV summary
        let firstTopic = `${ctx.type} Foundations in ${ctx.role}`;
        if (ctx.cvSummary) {
          const cvSkill = ctx.cvSummary.skills?.[0];
          const cvProject = ctx.cvSummary.projects?.[0]?.name;
          if (cvProject) {
            firstTopic = `Project Architecture: ${cvProject}`;
          } else if (cvSkill) {
            firstTopic = `Hands-on Experience with ${cvSkill}`;
          }
        }

        const topics = [
          firstTopic,
          `Core System Design for ${ctx.role}`,
          `Problem Solving & Execution (${ctx.difficulty} level)`,
        ];

        const greeting = `Hello! Welcome to your ${ctx.durationMinutes}-minute ${ctx.type.toLowerCase()} interview rehearsal for the ${ctx.role} position. I am your AI interviewer today.`;

        const firstQuestion = ctx.cvSummary?.projects?.[0]?.name
          ? `Could you walk me through the architecture of your "${ctx.cvSummary.projects[0].name}" project and the technical challenges you solved?`
          : `To begin, could you briefly describe your background as a ${ctx.role} and the most complex technical challenge you recently solved?`;

        const plan: InterviewPlan = {
          greeting,
          topics,
          evaluationCriteria: [
            'Technical accuracy and problem solving depth',
            'Communication clarity and structure',
            'Relevance to real-world software engineering practices',
          ],
          firstQuestion,
        };

        return {
          result: plan,
          usage: {
            inputTokens: 200,
            outputTokens: 400,
          },
        };
      }
    );
  }
}

export class GeminiInterviewPlanGenerator implements InterviewPlanGenerator {
  async generatePlan(ctx: PlanGenerationContext): Promise<InterviewPlan> {
    const prompt = this.buildPrompt(ctx);
    const estimatedInputTokens = Math.max(100, Math.ceil(prompt.length / 4));
    const estimatedOutputTokens = 600;

    return withAiUsage(
      {
        actorUserId: ctx.userId,
        operation: 'INTERVIEW_PLAN',
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens,
        estimatedOutputTokens,
        consumeInterview: true, // QTA-14: increments interviewsCreated
      },
      async () => {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, apiVersion: 'v1beta' });

          const resp = await ai.models.generateContent({
            model: env.GEMINI_TEXT_MODEL,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const rawText = resp.text || '';
          const parsed = JSON.parse(rawText) as InterviewPlan;

          if (
            !parsed.greeting ||
            !Array.isArray(parsed.topics) ||
            parsed.topics.length === 0 ||
            !Array.isArray(parsed.evaluationCriteria) ||
            !parsed.firstQuestion
          ) {
            throw new Error('AI returned incomplete plan structure');
          }

          // SET-5 validation: In CV modes, at least one topic must reference an item in the CV summary
          if (ctx.cvSummary && (ctx.mode === 'CV_BASED' || ctx.mode === 'CV_JD')) {
            const cvItems = [
              ...(ctx.cvSummary.skills || []),
              ...(ctx.cvSummary.technologies || []),
              ...(ctx.cvSummary.projects?.map((p) => p.name) || []),
            ].map((s) => s.toLowerCase());

            const topicText = parsed.topics.join(' ').toLowerCase();
            const referencesCv = cvItems.some((item) => topicText.includes(item));
            if (!referencesCv && cvItems.length > 0) {
              parsed.topics[0] = `Experience with ${cvItems[0]}`;
            }
          }

          return {
            result: parsed,
            usage: {
              inputTokens: resp.usageMetadata?.promptTokenCount || estimatedInputTokens,
              outputTokens: resp.usageMetadata?.candidatesTokenCount || estimatedOutputTokens,
            },
          };
        } catch (err) {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            'Gemini plan generation failed or rate limited, falling back to structured interview plan'
          );

          const fallbackPlan: InterviewPlan = {
            greeting: `Hello and welcome! I am your AI interviewer for today's ${ctx.durationMinutes}-minute ${ctx.type.toLowerCase()} interview rehearsal for the ${ctx.role} position.`,
            topics: [
              `${ctx.type} Core Competencies for ${ctx.role}`,
              `System Architecture & Technical Design`,
              `Problem Solving & Execution (${ctx.difficulty} level)`,
            ],
            evaluationCriteria: [
              'Technical depth and clarity of explanations',
              'System design methodology and architectural tradeoffs',
              'Communication structure and practical problem solving',
            ],
            firstQuestion: `To begin, could you walk me through your background as a ${ctx.role} and describe the most technically challenging problem you recently worked on?`,
          };

          return {
            result: fallbackPlan,
            usage: {
              inputTokens: estimatedInputTokens,
              outputTokens: estimatedOutputTokens,
            },
          };
        }
      }
    );
  }

  private buildPrompt(ctx: PlanGenerationContext): string {
    return `You are an expert interviewer and interview architect.
Design a structured interview plan for the following configuration:
- Role: ${ctx.role}
- Experience Level: ${ctx.experienceLevel}
- Interview Type: ${ctx.type}
- Starting Difficulty: ${ctx.difficulty}
- Duration: ${ctx.durationMinutes} minutes
- Max Questions: ${ctx.maxQuestions}

${ctx.cvSummary ? `Candidate CV Summary:\n${JSON.stringify(ctx.cvSummary, null, 2)}` : ''}
${ctx.jdSummary ? `Target Job Description Summary:\n${JSON.stringify(ctx.jdSummary, null, 2)}` : ''}

RULES (Strictly Follow):
1. Return a JSON object with keys:
   - "greeting": A warm, professional 1-2 sentence greeting introducing the interview.
   - "topics": An array of 3-5 distinct topics to cover across the interview.
   - "evaluationCriteria": An array of 3-4 scoring rubrics.
   - "firstQuestion": The opening question to ask the candidate.
2. DO NOT pre-generate follow-up questions (SET-4).
3. ${ctx.cvSummary ? 'At least one topic must explicitly reference a skill, project, or experience from the Candidate CV Summary. Never invent unmentioned experience (SET-5).' : ''}
`;
  }
}

let activePlanGenerator: InterviewPlanGenerator = new GeminiInterviewPlanGenerator();

export function getInterviewPlanGenerator(): InterviewPlanGenerator {
  return activePlanGenerator;
}

export function setInterviewPlanGenerator(generator: InterviewPlanGenerator): void {
  activePlanGenerator = generator;
}

export function resetInterviewPlanGenerator(): void {
  activePlanGenerator = new GeminiInterviewPlanGenerator();
}
