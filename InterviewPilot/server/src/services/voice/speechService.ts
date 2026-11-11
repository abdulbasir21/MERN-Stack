import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { AIOperationType } from '@prisma/client';
import { AppError } from '../../lib/errors.js';

export interface SpeechSynthesisResult {
  audioBase64: string;
  mimeType: string;
  caption: string;
  ttsCharacters?: number;
}

export interface SpeechSynthesisService {
  synthesizeSpeech(params: {
    text: string;
    voice?: string;
    userId: string;
    interviewId?: string;
  }): Promise<SpeechSynthesisResult>;
}

export class GeminiSpeechService implements SpeechSynthesisService {
  private ai: GoogleGenAI;

  constructor(apiKey = env.GEMINI_API_KEY) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async synthesizeSpeech(params: {
    text: string;
    voice?: string;
    userId: string;
    interviewId?: string;
  }): Promise<SpeechSynthesisResult> {
    const { text, voice = 'Puck', userId, interviewId } = params;
    const ttsCharacters = text.length;

    return withAiUsage(
      {
        actorUserId: userId,
        interviewId,
        operation: AIOperationType.SPEECH_SYNTHESIS,
        model: env.GEMINI_TTS_MODEL,
        estimatedInputTokens: Math.max(10, Math.round(ttsCharacters / 4)),
        estimatedOutputTokens: 100,
      },
      async () => {
        // VOI-6: Retry once on failure before raising ERROR
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await this.ai.models.generateContent({
              model: env.GEMINI_TTS_MODEL,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice,
                    },
                  },
                },
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text }],
                },
              ],
            });

            const candidate = response.candidates?.[0];
            const audioPart = candidate?.content?.parts?.find(
              (p) => p.inlineData?.mimeType?.startsWith('audio/')
            );

            if (!audioPart || !audioPart.inlineData?.data) {
              throw new Error('Gemini TTS returned no audio data');
            }

            return {
              result: {
                audioBase64: audioPart.inlineData.data,
                mimeType: audioPart.inlineData.mimeType || 'audio/wav',
                caption: text,
                ttsCharacters,
              },
              ttsCharacters,
            };
          } catch (err: unknown) {
            lastError = err;
            if (attempt === 1) {
              // Quick backoff before retry attempt
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
        }

        throw new AppError(
          'TTS_FAILED',
          `Speech synthesis failed after retry: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
          502
        );
      }
    );
  }
}

export class MockSpeechService implements SpeechSynthesisService {
  public callCount = 0;
  // Minimal valid 1-second 16kHz WAV header in base64
  public mockAudioBase64 =
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  public shouldFail = false;

  async synthesizeSpeech(params: {
    text: string;
    voice?: string;
    userId: string;
    interviewId?: string;
  }): Promise<SpeechSynthesisResult> {
    this.callCount++;
    if (this.shouldFail) {
      throw new AppError('TTS_FAILED', 'Simulated speech synthesis failure', 502);
    }
    return {
      audioBase64: this.mockAudioBase64,
      mimeType: 'audio/wav',
      caption: params.text,
      ttsCharacters: params.text.length,
    };
  }
}

let activeSpeechService: SpeechSynthesisService = new GeminiSpeechService();

export function getSpeechService(): SpeechSynthesisService {
  return activeSpeechService;
}

export function setSpeechService(service: SpeechSynthesisService): void {
  activeSpeechService = service;
}

export function resetSpeechService(): void {
  activeSpeechService = new GeminiSpeechService();
}
