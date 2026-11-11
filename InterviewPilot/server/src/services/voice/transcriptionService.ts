import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { AIOperationType } from '@prisma/client';
import { AppError } from '../../lib/errors.js';

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
    this.ai = new GoogleGenAI({ apiKey });
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
        try {
          const base64Audio = audioBuffer.toString('base64');
          const normalizedMime = mimeType.split(';')[0].trim();

          const response = await this.ai.models.generateContent({
            model: env.GEMINI_TRANSCRIBE_MODEL,
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

          const transcript = (response.text || '').trim();
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
          throw new AppError(
            'TRANSCRIPTION_FAILED',
            `Audio transcription failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            502
          );
        }
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
