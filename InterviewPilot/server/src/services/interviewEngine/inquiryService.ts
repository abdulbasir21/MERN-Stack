import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { retrieveRelevantChunks } from '../rag/ragService.js';
import { buildInquiryPrompt, INQUIRY_MAX_REPLY_CHARS } from '../../lib/interviewEngineMath.js';

export interface AnswerInquiryParams {
  userId: string;
  interviewId: string;
  pendingQuestion: string;
  inquiry: string;
  interviewDocIds: string[];
}

export interface InquiryAnswerer {
  answerInquiry(params: AnswerInquiryParams): Promise<string>;
}

export class MockInquiryAnswerer implements InquiryAnswerer {
  public callCount = 0;

  async answerInquiry(params: AnswerInquiryParams): Promise<string> {
    return withAiUsage(
      {
        actorUserId: params.userId,
        interviewId: params.interviewId,
        operation: 'CANDIDATE_INQUIRY',
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens: 200,
        estimatedOutputTokens: 150,
      },
      async () => {
        this.callCount++;

        // ENG-10: Inquiries may trigger RAG retrieval (RAG-5)
        if (params.interviewDocIds.length > 0) {
          await retrieveRelevantChunks({
            userId: params.userId,
            documentIds: params.interviewDocIds,
            query: params.inquiry,
          });
        }

        const reply = `Regarding your inquiry on "${params.inquiry}": please focus on high-level architectural trade-offs and your personal reasoning. I cannot provide the specific ideal solution, but consider consistency vs availability.`;
        const cappedReply =
          reply.length > INQUIRY_MAX_REPLY_CHARS
            ? reply.slice(0, INQUIRY_MAX_REPLY_CHARS - 3) + '...'
            : reply;

        return {
          result: cappedReply,
          usage: {
            inputTokens: 180,
            outputTokens: 120,
          },
        };
      }
    );
  }
}

export class GeminiInquiryAnswerer implements InquiryAnswerer {
  async answerInquiry(params: AnswerInquiryParams): Promise<string> {
    let chunks: string[] = [];
    if (params.interviewDocIds.length > 0) {
      const retrieved = await retrieveRelevantChunks({
        userId: params.userId,
        documentIds: params.interviewDocIds,
        query: params.inquiry,
      });
      chunks = retrieved.map((c) => c.content);
    }

    const prompt = buildInquiryPrompt({
      pendingQuestion: params.pendingQuestion,
      inquiry: params.inquiry,
      retrievedChunks: chunks,
    });

    return withAiUsage(
      {
        actorUserId: params.userId,
        interviewId: params.interviewId,
        operation: 'CANDIDATE_INQUIRY',
        model: env.GEMINI_TEXT_MODEL,
        estimatedInputTokens: Math.ceil(prompt.length / 4),
        estimatedOutputTokens: 180,
      },
      async () => {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, apiVersion: 'v1beta' });

          const resp = await ai.models.generateContent({
            model: env.GEMINI_TEXT_MODEL,
            contents: prompt,
            config: {
              temperature: 0.3,
            },
          });

          let text = resp.text?.trim() || 'Please proceed with your answer based on standard industry principles.';
          if (text.length > INQUIRY_MAX_REPLY_CHARS) {
            text = text.slice(0, INQUIRY_MAX_REPLY_CHARS - 3) + '...';
          }

          return {
            result: text,
            usage: {
              inputTokens: resp.usageMetadata?.promptTokenCount || 200,
              outputTokens: resp.usageMetadata?.candidatesTokenCount || 100,
            },
          };
        } catch (err) {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            'Gemini inquiry answerer unavailable; using fallback clarification'
          );
          return {
            result:
              'Good question — please focus on the core architectural requirements, trade-offs, and constraints you would prioritize in production.',
            usage: {
              inputTokens: 200,
              outputTokens: 60,
            },
          };
        }
      }
    );
  }
}

let customInquiryAnswerer: InquiryAnswerer | null = null;
let defaultMockInquiryAnswerer = new MockInquiryAnswerer();

export function getInquiryAnswerer(): InquiryAnswerer {
  if (customInquiryAnswerer) {
    return customInquiryAnswerer;
  }
  if (process.env.NODE_ENV !== 'test' && env.GEMINI_API_KEY) {
    return new GeminiInquiryAnswerer();
  }
  return defaultMockInquiryAnswerer;
}

export function setInquiryAnswerer(answerer: InquiryAnswerer): void {
  customInquiryAnswerer = answerer;
}

export function resetInquiryAnswerer(): void {
  customInquiryAnswerer = null;
  defaultMockInquiryAnswerer = new MockInquiryAnswerer();
}
