import type { InterviewRuntimeState } from './index.js';

export const SILENCE_THRESHOLD = 0.01;
export const MAX_RECORDING_SECONDS = 120;
export const MAX_AUDIO_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB (VOI-2)

export const ALLOWED_AUDIO_MIME_TYPES = Object.freeze([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/aac',
]);

/**
 * Calculates root-mean-square (RMS) of audio sample buffer.
 * Samples are assumed to be normalized in [-1.0, 1.0].
 */
export function computeRms(samples: Float32Array | number[]): number {
  if (!samples || samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const val = samples[i];
    sumSquares += val * val;
  }
  return Math.sqrt(sumSquares / samples.length);
}

export interface BarHeightsOptions {
  numBars?: number;
  silenceThreshold?: number;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Pure function mapping RMS to an array of bar heights for the audio waveform (VOI-8).
 * RMS below SILENCE_THRESHOLD (0.01) renders completely flat bars (at minHeight).
 * When RMS exceeds SILENCE_THRESHOLD, bar heights scale smoothly between minHeight and maxHeight.
 */
export function mapRmsToBarHeights(
  rms: number,
  options: BarHeightsOptions = {}
): number[] {
  const numBars = options.numBars ?? 24;
  const silenceThreshold = options.silenceThreshold ?? SILENCE_THRESHOLD;
  const minHeight = options.minHeight ?? 4;
  const maxHeight = options.maxHeight ?? 48;

  if (rms <= silenceThreshold || isNaN(rms)) {
    return new Array(numBars).fill(minHeight);
  }

  // Scale RMS [silenceThreshold, 0.5] linearly/smoothly into [minHeight, maxHeight]
  const clampedRms = Math.min(Math.max(rms, silenceThreshold), 0.5);
  const normalizedPower = (clampedRms - silenceThreshold) / (0.5 - silenceThreshold);

  const bars: number[] = [];
  for (let i = 0; i < numBars; i++) {
    // Generate organic waveform distribution centered in the middle
    const centerFactor = 1 - Math.abs((i - (numBars - 1) / 2) / ((numBars - 1) / 2)) * 0.4;
    // Harmonic wave variation per bar
    const wave = Math.sin((i / numBars) * Math.PI * 2) * 0.15;
    const barScale = Math.max(0.1, centerFactor + wave);

    const height = Math.round(
      minHeight + (maxHeight - minHeight) * normalizedPower * barScale
    );
    bars.push(Math.min(maxHeight, Math.max(minHeight, height)));
  }

  return bars;
}

/**
 * VOI-4: Evaluates whether a candidate's answer is considered empty.
 * Empty answer =
 *  - duration shorter than 1 second, OR
 *  - transcript with fewer than 2 words, OR
 *  - silence only
 * When true, ZERO evaluation AI calls should be made.
 */
export function isEmptyAnswer(params: {
  durationSeconds: number;
  transcript: string;
  isSilenceOnly?: boolean;
}): boolean {
  if (params.isSilenceOnly) return true;
  if (params.durationSeconds < 1) return true;

  const words = params.transcript
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  return words.length < 2;
}

/**
 * VOI-11: While the state is RECRUITER_SPEAKING, PROCESSING_ANSWER, AI_THINKING,
 * or GENERATING_NEXT_QUESTION, the recorder is not recording (MediaRecorder inactive).
 * No voice interruption (barge-in) exists.
 * MediaRecorder starts ONLY in CANDIDATE_RECORDING.
 */
export function isRecorderAllowed(state: InterviewRuntimeState): boolean {
  return state === 'CANDIDATE_LISTENING';
}

/**
 * VOI-2: Audio upload validation.
 * Max size: 5 MB; allowed types: webm, ogg, mp4, wav, m4a, mp3, aac.
 */
export function validateAudioUpload(params: {
  mimeType: string;
  sizeBytes: number;
}): { valid: boolean; error?: string } {
  if (params.sizeBytes <= 0) {
    return { valid: false, error: 'Audio file is empty.' };
  }

  if (params.sizeBytes > MAX_AUDIO_UPLOAD_BYTES) {
    return {
      valid: false,
      error: `Audio file exceeds maximum size of 5 MB (${(params.sizeBytes / 1024 / 1024).toFixed(1)} MB received).`,
    };
  }

  const normalizedMime = params.mimeType.toLowerCase().split(';')[0].trim();
  const isAllowed = ALLOWED_AUDIO_MIME_TYPES.some((allowed) =>
    normalizedMime.includes(allowed)
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: `Unsupported audio format "${params.mimeType}". Allowed formats: ${ALLOWED_AUDIO_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * VOI-1: A single recording stops automatically at 120 seconds and is submitted.
 */
export function isAnswerTimeLimitExceeded(elapsedSeconds: number): boolean {
  return elapsedSeconds >= MAX_RECORDING_SECONDS;
}
