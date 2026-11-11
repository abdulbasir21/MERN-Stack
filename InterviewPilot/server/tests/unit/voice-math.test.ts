import { describe, it, expect } from 'vitest';
import {
  computeRms,
  mapRmsToBarHeights,
  isEmptyAnswer,
  isRecorderAllowed,
  validateAudioUpload,
  isAnswerTimeLimitExceeded,
  SILENCE_THRESHOLD,
  MAX_RECORDING_SECONDS,
  MAX_AUDIO_UPLOAD_BYTES,
  ALLOWED_AUDIO_MIME_TYPES,
} from '@interviewpilot/shared';
import type { InterviewRuntimeState } from '@interviewpilot/shared';

describe('Phase 8 (a) — Voice & Waveform Pure Math (VOI-1 to VOI-11)', () => {
  describe('VOI-8: computeRms and Waveform bar height mapping', () => {
    it('computes 0 RMS for empty or zero buffers', () => {
      expect(computeRms([])).toBe(0);
      expect(computeRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
    });

    it('computes correct RMS for known sinusoids or constant buffers', () => {
      // Buffer of constant value 0.5 -> RMS = 0.5
      const constantBuffer = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      expect(computeRms(constantBuffer)).toBeCloseTo(0.5, 5);

      // Buffer of square wave [-1, 1, -1, 1] -> RMS = 1.0
      const squareWave = new Float32Array([-1, 1, -1, 1]);
      expect(computeRms(squareWave)).toBeCloseTo(1.0, 5);
    });

    it('VOI-8: renders flat bars when RMS is below or equal to SILENCE_THRESHOLD (0.01)', () => {
      const flatBarsZero = mapRmsToBarHeights(0);
      expect(flatBarsZero.length).toBe(24);
      expect(flatBarsZero.every((h) => h === 4)).toBe(true); // default minHeight = 4

      const flatBarsSilence = mapRmsToBarHeights(0.009); // below 0.01
      expect(flatBarsSilence.every((h) => h === 4)).toBe(true);

      const flatBarsExactThreshold = mapRmsToBarHeights(SILENCE_THRESHOLD); // 0.01
      expect(flatBarsExactThreshold.every((h) => h === 4)).toBe(true);
    });

    it('VOI-8: renders dynamically elevated bars when RMS exceeds SILENCE_THRESHOLD', () => {
      const activeBarsLow = mapRmsToBarHeights(0.05);
      const activeBarsHigh = mapRmsToBarHeights(0.35);

      // Bars must not all be flat
      expect(activeBarsLow.some((h) => h > 4)).toBe(true);
      expect(activeBarsHigh.some((h) => h > 4)).toBe(true);

      // Higher RMS produces greater average bar height
      const avgLow = activeBarsLow.reduce((a, b) => a + b, 0) / activeBarsLow.length;
      const avgHigh = activeBarsHigh.reduce((a, b) => a + b, 0) / activeBarsHigh.length;
      expect(avgHigh).toBeGreaterThan(avgLow);

      // Bar heights are bounded within [minHeight, maxHeight]
      expect(activeBarsHigh.every((h) => h >= 4 && h <= 48)).toBe(true);
    });

    it('custom options (numBars, minHeight, maxHeight, custom threshold) are respected', () => {
      const customBars = mapRmsToBarHeights(0.2, {
        numBars: 12,
        minHeight: 8,
        maxHeight: 64,
        silenceThreshold: 0.05,
      });

      expect(customBars.length).toBe(12);
      expect(customBars.every((h) => h >= 8 && h <= 64)).toBe(true);
      expect(customBars.some((h) => h > 8)).toBe(true);
    });
  });

  describe('VOI-4: isEmptyAnswer detection', () => {
    it('returns true when duration is shorter than 1 second', () => {
      expect(
        isEmptyAnswer({
          durationSeconds: 0.8,
          transcript: 'This is a complete sentence that was somehow recorded too quickly.',
        })
      ).toBe(true);

      expect(
        isEmptyAnswer({
          durationSeconds: 0.0,
          transcript: 'Nothing',
        })
      ).toBe(true);
    });

    it('returns true when transcript has fewer than 2 words', () => {
      expect(
        isEmptyAnswer({
          durationSeconds: 5.0,
          transcript: '',
        })
      ).toBe(true);

      expect(
        isEmptyAnswer({
          durationSeconds: 5.0,
          transcript: '   ',
        })
      ).toBe(true);

      expect(
        isEmptyAnswer({
          durationSeconds: 3.2,
          transcript: 'Um...',
        })
      ).toBe(true);

      expect(
        isEmptyAnswer({
          durationSeconds: 2.5,
          transcript: 'Hello',
        })
      ).toBe(true);
    });

    it('returns true when isSilenceOnly flag is set', () => {
      expect(
        isEmptyAnswer({
          durationSeconds: 15.0,
          transcript: 'I answered everything clearly',
          isSilenceOnly: true,
        })
      ).toBe(true);
    });

    it('returns false for a valid answer (>= 1s and >= 2 words and not silence only)', () => {
      expect(
        isEmptyAnswer({
          durationSeconds: 1.0,
          transcript: 'Yes, absolutely.',
        })
      ).toBe(false);

      expect(
        isEmptyAnswer({
          durationSeconds: 45.2,
          transcript: 'In my previous position I architected microservices using Node and PostgreSQL.',
        })
      ).toBe(false);
    });
  });

  describe('VOI-11 & VOI-1: isRecorderAllowed state gating', () => {
    it('allows recording ONLY in CANDIDATE_LISTENING state', () => {
      expect(isRecorderAllowed('CANDIDATE_LISTENING')).toBe(true);
    });

    it('VOI-11: strictly forbids recording during the 4 non-listening states (no voice interruption)', () => {
      expect(isRecorderAllowed('RECRUITER_SPEAKING')).toBe(false);
      expect(isRecorderAllowed('PROCESSING_ANSWER')).toBe(false);
      expect(isRecorderAllowed('AI_THINKING')).toBe(false);
      expect(isRecorderAllowed('GENERATING_NEXT_QUESTION')).toBe(false);
    });

    it('forbids recording during all other lifecycle states', () => {
      const otherStates: InterviewRuntimeState[] = [
        'INITIALIZING',
        'WAITING_FOR_CANDIDATE',
        'GENERATING_FEEDBACK',
        'INTERVIEW_COMPLETED',
        'ERROR',
      ];

      for (const st of otherStates) {
        expect(isRecorderAllowed(st)).toBe(false);
      }
    });
  });

  describe('VOI-2: validateAudioUpload size and MIME checks', () => {
    it('accepts valid audio formats under 5 MB', () => {
      for (const mime of ALLOWED_AUDIO_MIME_TYPES) {
        const res = validateAudioUpload({
          mimeType: mime,
          sizeBytes: 1.5 * 1024 * 1024, // 1.5 MB
        });
        expect(res.valid).toBe(true);
        expect(res.error).toBeUndefined();
      }
    });

    it('accepts audio formats with codecs parameters in MIME type', () => {
      const res = validateAudioUpload({
        mimeType: 'audio/webm;codecs=opus',
        sizeBytes: 500 * 1024,
      });
      expect(res.valid).toBe(true);
    });

    it('rejects files larger than 5 MB (MAX_AUDIO_UPLOAD_BYTES)', () => {
      const res = validateAudioUpload({
        mimeType: 'audio/webm',
        sizeBytes: MAX_AUDIO_UPLOAD_BYTES + 1,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum size of 5 MB');
    });

    it('rejects 0-byte or empty files', () => {
      const res = validateAudioUpload({
        mimeType: 'audio/webm',
        sizeBytes: 0,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Audio file is empty.');
    });

    it('rejects disallowed MIME types', () => {
      const disallowed = ['image/png', 'application/pdf', 'video/mp4', 'text/plain'];
      for (const mime of disallowed) {
        const res = validateAudioUpload({
          mimeType: mime,
          sizeBytes: 1024,
        });
        expect(res.valid).toBe(false);
        expect(res.error).toContain('Unsupported audio format');
      }
    });
  });

  describe('VOI-1: 120-second recording time limit', () => {
    it('returns false when elapsed seconds are below MAX_RECORDING_SECONDS (120)', () => {
      expect(isAnswerTimeLimitExceeded(0)).toBe(false);
      expect(isAnswerTimeLimitExceeded(60)).toBe(false);
      expect(isAnswerTimeLimitExceeded(119.9)).toBe(false);
    });

    it('returns true when elapsed seconds reach or exceed 120', () => {
      expect(isAnswerTimeLimitExceeded(MAX_RECORDING_SECONDS)).toBe(true);
      expect(isAnswerTimeLimitExceeded(120.1)).toBe(true);
      expect(isAnswerTimeLimitExceeded(180)).toBe(true);
    });
  });
});
