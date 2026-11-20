import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { withAiUsage } from '../quota/quotaEngine.js';
import { AIOperationType } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

function parseSampleRateFromMime(mimeType: string): number {
  const match = mimeType.match(/rate=(\d+)/i);
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 24000;
}

function wrapPcmInWavHeader(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function generateSpeechLikeWavBase64(text: string, sampleRate = 16000): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const durationSeconds = Math.min(12, Math.max(1.5, words * 0.35));
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const pcm = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Syllable-like amplitude envelope at ~4 Hz for natural lip-sync motion
    const syllableEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.8 * t);
    const carrier =
      0.55 * Math.sin(2 * Math.PI * 130 * t) +
      0.28 * Math.sin(2 * Math.PI * 420 * t) +
      0.17 * Math.sin(2 * Math.PI * 950 * t);
    const sample = Math.max(-1, Math.min(1, carrier * syllableEnv * 0.25));
    pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  return wrapPcmInWavHeader(pcm, sampleRate, 1, 16).toString('base64');
}

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
    this.ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
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
        // VOI-6: Retry before falling back to local formant WAV + browser TTS
        let lastError: unknown = null;
        const modelsToTry = Array.from(
          new Set([env.GEMINI_TTS_MODEL, 'gemini-2.5-flash-preview-tts'].filter(Boolean))
        );

        for (const modelName of modelsToTry) {
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const response = await this.ai.models.generateContent({
                model: modelName,
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

              const rawMime = audioPart.inlineData.mimeType || 'audio/wav';
              let audioBase64 = audioPart.inlineData.data;
              let finalMime = rawMime;

              if (
                rawMime.toLowerCase().includes('l16') ||
                rawMime.toLowerCase().includes('pcm') ||
                (!rawMime.includes('wav') &&
                  !rawMime.includes('mp3') &&
                  !rawMime.includes('mpeg') &&
                  !rawMime.includes('ogg') &&
                  !rawMime.includes('webm'))
              ) {
                const sampleRate = parseSampleRateFromMime(rawMime);
                const pcmBuf = Buffer.from(audioBase64, 'base64');
                audioBase64 = wrapPcmInWavHeader(pcmBuf, sampleRate, 1, 16).toString('base64');
                finalMime = 'audio/wav';
              }

              return {
                result: {
                  audioBase64,
                  mimeType: finalMime,
                  caption: text,
                  ttsCharacters,
                },
                ttsCharacters,
              };
            } catch (err: unknown) {
              lastError = err;
              if (attempt === 1) {
                await new Promise((resolve) => setTimeout(resolve, 400));
              }
            }
          }
        }

        logger.warn(
          { err: lastError instanceof Error ? lastError.message : String(lastError) },
          'Gemini TTS unavailable, using 16kHz formant lip-sync fallback WAV'
        );

        return {
          result: {
            audioBase64: generateSpeechLikeWavBase64(text, 16000),
            mimeType: 'audio/wav',
            caption: text,
            ttsCharacters,
          },
          ttsCharacters,
        };
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
