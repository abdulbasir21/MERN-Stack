import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { AIOperationType } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

interface GeminiTranscriptWord {
  word?: string;
  text?: string;
}

interface GeminiAudioTranscriptionPart {
  text?: string;
  words?: GeminiTranscriptWord[];
}

interface GeminiContentPart {
  text?: string;
  thought?: boolean;
  audioTranscription?: GeminiAudioTranscriptionPart;
}

interface GeminiTranscriptResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiContentPart[];
    };
  }>;
  text?: string;
}

export function extractTranscriptFromGeminiResponse(response: unknown): string {
  const resp = response as GeminiTranscriptResponse | null | undefined;
  const parts = resp?.candidates?.[0]?.content?.parts ?? [];
  const pieces: string[] = [];

  for (const part of parts) {
    const audioText = part?.audioTranscription?.text;
    if (typeof audioText === 'string' && audioText.trim().length > 0) {
      pieces.push(audioText.trim());
      continue;
    }

    const words = part?.audioTranscription?.words;
    if (Array.isArray(words) && words.length > 0) {
      const joinedWords = words
        .map((w) => (w?.word || w?.text || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      if (joinedWords.length > 0) {
        pieces.push(joinedWords);
        continue;
      }
    }

    if (typeof part?.text === 'string' && !part.thought && part.text.trim().length > 0) {
      pieces.push(part.text.trim());
    }
  }

  if (pieces.length > 0) {
    return pieces.join(' ').trim();
  }

  return typeof resp?.text === 'string' ? resp.text.trim() : '';
}

export interface AudioTranscriptionResult {
  transcript: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AudioTranscriptionService {
  transcribeAudio(params: {
    audioBuffer: Buffer;
    mimeType: string;
    userId: string;
    interviewId?: string;
  }): Promise<AudioTranscriptionResult>;
}

export class GeminiTranscriptionService implements AudioTranscriptionService {
  private ai: GoogleGenAI;

  constructor(apiKey = env.GEMINI_API_KEY) {
    this.ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  }

  async transcribeAudio(params: {
    audioBuffer: Buffer;
    mimeType: string;
    userId: string;
    interviewId?: string;
  }): Promise<AudioTranscriptionResult> {
    const { audioBuffer, mimeType, userId, interviewId } = params;

    // Estimate tokens roughly based on audio duration/size (~50 tokens per sec, ~1000 tokens for 5MB max)
    const estimatedInputTokens = Math.max(100, Math.round(audioBuffer.length / 500));
    const estimatedOutputTokens = 300;

    return withAiUsage(
      {
        actorUserId: userId,
        interviewId,
        operation: AIOperationType.SPEECH_TRANSCRIPTION,
        model: env.GEMINI_TRANSCRIBE_MODEL,
        estimatedInputTokens,
        estimatedOutputTokens,
      },
      async () => {
        const base64Audio = audioBuffer.toString('base64');
        const normalizedMime = mimeType.split(';')[0].trim();
        const modelsToTry = Array.from(
          new Set([env.GEMINI_TRANSCRIBE_MODEL, env.GEMINI_TEXT_MODEL, 'gemini-2.5-flash'].filter(Boolean))
        );
        let lastError: unknown = null;

        for (const modelName of modelsToTry) {
          try {
            const response = await this.ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: 'Please transcribe the following audio recording verbatim. Output only the transcribed spoken English words. Do not add preface, markdown quotes, formatting, or commentary.',
                    },
                    {
                      inlineData: {
                        mimeType: normalizedMime,
                        data: base64Audio,
                      },
                    },
                  ],
                },
              ],
            });

            const transcript = extractTranscriptFromGeminiResponse(response);
            if (!transcript) {
              continue;
            }
            const usage = response.usageMetadata;

            return {
              result: {
                transcript,
                inputTokens: usage?.promptTokenCount,
                outputTokens: usage?.candidatesTokenCount,
              },
              inputTokens: usage?.promptTokenCount || estimatedInputTokens,
              outputTokens: usage?.candidatesTokenCount || estimatedOutputTokens,
            };
          } catch (err: unknown) {
            lastError = err;
          }
        }

        logger.warn(
          { err: lastError instanceof Error ? lastError.message : String(lastError) },
          'Gemini transcription returned empty or failed across models'
        );

        return {
          result: {
            transcript: '',
            inputTokens: estimatedInputTokens,
            outputTokens: estimatedOutputTokens,
          },
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
        };
      }
    );
  }
}

export class MockTranscriptionService implements AudioTranscriptionService {
  public callCount = 0;
  public mockTranscript = 'I have extensive experience with distributed systems and React microfrontends.';
  public shouldFail = false;

  async transcribeAudio(_params: {
    audioBuffer: Buffer;
    mimeType: string;
    userId: string;
    interviewId?: string;
  }): Promise<AudioTranscriptionResult> {
    this.callCount++;
    if (this.shouldFail) {
      throw new AppError('TRANSCRIPTION_FAILED', 'Simulated audio transcription failure', 502);
    }
    return {
      transcript: this.mockTranscript,
      inputTokens: 150,
      outputTokens: 40,
    };
  }
}

let activeTranscriptionService: AudioTranscriptionService = new GeminiTranscriptionService();

export function getTranscriptionService(): AudioTranscriptionService {
  return activeTranscriptionService;
}

export function setTranscriptionService(service: AudioTranscriptionService): void {
  activeTranscriptionService = service;
}

export function resetTranscriptionService(): void {
  activeTranscriptionService = new GeminiTranscriptionService();
}
