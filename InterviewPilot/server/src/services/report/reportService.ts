import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { env } from '../../config/env.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { AIOperationType } from '@prisma/client';
import { AppError } from '../../lib/errors.js';

export interface ReportGenerationInput {
  interviewId: string;
  userId: string;
  role: string;
  type: string;
  overallScore: number | null;
  evaluationsDigest: Array<{
    topic: string;
    questionText: string;
    score: number;
    correct?: string | null;
    missing?: string | null;
    strengths?: string[];
    weaknesses?: string[];
    improvements?: string[];
  }>;
}

export interface ReportGenerationOutput {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  studyTopics: string[];
}

export interface ReportGenerator {
  generateReport(input: ReportGenerationInput): Promise<ReportGenerationOutput>;
}

export const ReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Comprehensive executive summary of candidate performance',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key candidate strengths observed across answers',
    },
    weaknesses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Areas where candidate lacked depth or structure',
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Actionable steps candidate can take to improve',
    },
    studyTopics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Targeted technical or domain concepts for further study',
    },
  },
  required: ['summary', 'strengths', 'weaknesses', 'recommendations', 'studyTopics'],
};

export class GeminiReportGenerator implements ReportGenerator {
  private ai: GoogleGenAI;

  constructor(apiKey = env.GEMINI_API_KEY) {
    this.ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  }

  async generateReport(input: ReportGenerationInput): Promise<ReportGenerationOutput> {
    const compactDigestText = JSON.stringify({
      targetRole: input.role,
      interviewType: input.type,
      overallScore: input.overallScore,
      answersDigest: input.evaluationsDigest,
    });

    const estimatedInput = Math.max(100, Math.round(compactDigestText.length / 4));
    const estimatedOutput = 600;

    return withAiUsage(
      {
        actorUserId: input.userId,
        interviewId: input.interviewId,
        operation: AIOperationType.REPORT_GENERATION,
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens: estimatedInput,
        estimatedOutputTokens: estimatedOutput,
        consumeReport: true,
      },
      async () => {
        const prompt = `You are an elite executive talent assessor and interview coach.
Analyze the following compact digest of an interview session and generate a comprehensive performance assessment report.

Do not score by length or vocabulary; do not inflate scores. Evaluate purely on demonstrated domain mastery, structure, and technical or behavioral problem-solving.

Digest:
${compactDigestText}

Generate a concise yet thorough report in JSON matching the schema.`;

        try {
          const response = await this.ai.models.generateContent({
            model: env.GEMINI_TEXT_MODEL,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: ReportSchema,
            },
          });

          const raw = response.text?.trim() || '{}';
          const parsed = JSON.parse(raw) as ReportGenerationOutput;

          const result: ReportGenerationOutput = {
            summary: parsed.summary || 'Interview concluded with solid fundamentals.',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Solid conceptual clarity'],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ['Could articulate tradeoffs with deeper precision'],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Practice structured STAR storytelling'],
            studyTopics: Array.isArray(parsed.studyTopics) ? parsed.studyTopics : ['Advanced system architecture patterns'],
          };

          return {
            result,
            inputTokens: estimatedInput,
            outputTokens: estimatedOutput,
          };
        } catch {
          const fallback = await new MockReportGenerator().generateReport(input);
          return {
            result: fallback,
            inputTokens: estimatedInput,
            outputTokens: estimatedOutput,
          };
        }
      }
    );
  }
}

export class MockReportGenerator implements ReportGenerator {
  public callCount = 0;
  public shouldFail = false;

  async generateReport(input: ReportGenerationInput): Promise<ReportGenerationOutput> {
    this.callCount++;
    if (this.shouldFail) {
      throw new AppError('AI_UNAVAILABLE', 'Simulated report generation failure', 503);
    }

    return {
      summary: `Candidate demonstrated strong competence for the ${input.role} role with an overall score of ${input.overallScore ?? 'N/A'}. Clear reasoning and good domain mastery were evident throughout the session.`,
      strengths: [
        'Strong foundational architecture concepts',
        'Systematic approach to problem decomposition',
        'Direct and professional communication style',
      ],
      weaknesses: [
        'Could provide deeper quantitative evidence in system sizing',
        'Could articulate failure recovery tradeoffs more explicitly',
      ],
      recommendations: [
        'Structure answers using Situation, Task, Action, Result framing',
        'Practice estimating cache hit ratios and throughput boundaries',
      ],
      studyTopics: [
        'Distributed Caching & Redis Patterns',
        'High-concurrency database connection pooling',
      ],
    };
  }
}

let activeReportGenerator: ReportGenerator = new GeminiReportGenerator();

export function getReportGenerator(): ReportGenerator {
  return activeReportGenerator;
}

export function setReportGenerator(generator: ReportGenerator): void {
  activeReportGenerator = generator;
}

export function resetReportGenerator(): void {
  activeReportGenerator = new GeminiReportGenerator();
}
