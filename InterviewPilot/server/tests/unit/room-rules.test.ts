import { describe, it, expect } from 'vitest';
import {
  getRoomButtonStates,
  mapRoomErrorMessage,
  type InterviewRuntimeState,
} from '@interviewpilot/shared';

describe('Phase 9 — Room Rules & Button Enable Matrix (ROOM-2, ROOM-6)', () => {
  describe('ROOM-2: Button Enablement Table', () => {
    it('RECRUITER_SPEAKING: Mute enabled, End Interview enabled, others disabled', () => {
      const buttons = getRoomButtonStates('RECRUITER_SPEAKING');
      expect(buttons).toEqual({
        canMute: true,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: false,
      });
    });

    it('WAITING_FOR_CANDIDATE: Mute enabled, End Interview enabled, others disabled', () => {
      const buttons = getRoomButtonStates('WAITING_FOR_CANDIDATE');
      expect(buttons).toEqual({
        canMute: true,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: false,
      });
    });

    it('CANDIDATE_LISTENING with inquiries remaining: Mute, Finish Answer, Ask Question, End Interview enabled', () => {
      const buttons = getRoomButtonStates('CANDIDATE_LISTENING', { inquiriesRemaining: 2 });
      expect(buttons).toEqual({
        canMute: true,
        canFinishAnswer: true,
        canAskQuestion: true,
        canEndInterview: true,
        canRetry: false,
      });
    });

    it('CANDIDATE_LISTENING with 0 inquiries remaining: Ask Question is disabled', () => {
      const buttons = getRoomButtonStates('CANDIDATE_LISTENING', { inquiriesRemaining: 0 });
      expect(buttons).toEqual({
        canMute: true,
        canFinishAnswer: true,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: false,
      });
    });

    it('Processing/Thinking states: Mute disabled, Finish disabled, Ask disabled, End Interview enabled', () => {
      const thinkingStates: InterviewRuntimeState[] = [
        'PROCESSING_ANSWER',
        'AI_THINKING',
        'GENERATING_NEXT_QUESTION',
        'GENERATING_FEEDBACK',
      ];

      for (const st of thinkingStates) {
        const buttons = getRoomButtonStates(st);
        expect(buttons).toEqual({
          canMute: false,
          canFinishAnswer: false,
          canAskQuestion: false,
          canEndInterview: true,
          canRetry: false,
        });
      }
    });

    it('ERROR: End Interview enabled and Retry enabled; others disabled', () => {
      const buttons = getRoomButtonStates('ERROR');
      expect(buttons).toEqual({
        canMute: false,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: true,
      });
    });

    it('INTERVIEW_COMPLETED: all buttons disabled', () => {
      const buttons = getRoomButtonStates('INTERVIEW_COMPLETED');
      expect(buttons).toEqual({
        canMute: false,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: false,
        canRetry: false,
      });
    });
  });

  describe('ROOM-6: Plain Error Message Mapping', () => {
    it('maps standard error codes to clear candidate guidance', () => {
      expect(mapRoomErrorMessage('MICROPHONE_DENIED')).toContain('Microphone access was denied');
      expect(mapRoomErrorMessage('MICROPHONE_LOST')).toContain('Microphone was disconnected');
      expect(mapRoomErrorMessage('AUDIO_PLAYBACK_FAILED')).toContain('Audio playback failed');
      expect(mapRoomErrorMessage('TRANSCRIPTION_FAILED')).toContain('could not transcribe your answer');
      expect(mapRoomErrorMessage('TTS_FAILED')).toContain('voice generation encountered an error');
      expect(mapRoomErrorMessage('USER_QUOTA_EXCEEDED')).toContain('daily interview quota limit');
      expect(mapRoomErrorMessage('GLOBAL_BUDGET_EXHAUSTED')).toContain('Platform interview capacity');
      expect(mapRoomErrorMessage('NETWORK_LOST')).toContain('Network connection was interrupted');
      expect(mapRoomErrorMessage('UNAUTHENTICATED')).toContain('session has expired');
    });

    it('sanitizes unexpected errors preventing leakage of stack traces or SQL', () => {
      const dangerousMessage = 'Error at Object.<anonymous> (server/db.ts:12) SELECT * FROM secrets';
      const mapped = mapRoomErrorMessage('UNKNOWN_FATAL', dangerousMessage);
      expect(mapped).not.toContain('SELECT');
      expect(mapped).not.toContain('at Object');
      expect(mapped).toContain('unexpected issue occurred');
    });
  });
});
