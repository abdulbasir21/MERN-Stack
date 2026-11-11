import type { InterviewRuntimeState } from './index.js';

export interface RoomButtonStates {
  canMute: boolean;
  canFinishAnswer: boolean;
  canAskQuestion: boolean;
  canEndInterview: boolean;
  canRetry: boolean;
}

/**
 * ROOM-2: Pure function returning button enablement rules for every interview runtime state.
 *
 * | State | Mute | Finish Answer | Ask a Question | End Interview | Retry |
 * |---|---|---|---|---|---|
 * | RECRUITER_SPEAKING | yes | no | no | yes | no |
 * | WAITING_FOR_CANDIDATE | yes | no | no | yes | no |
 * | CANDIDATE_LISTENING | yes | yes | yes (if inquiries left) | yes | no |
 * | PROCESSING / AI_THINKING / GENERATING | no | no | no | yes | no |
 * | ERROR | no | no | no | yes | yes |
 */
export function getRoomButtonStates(
  state: InterviewRuntimeState,
  options: { inquiriesRemaining?: number } = {}
): RoomButtonStates {
  const inquiriesRemaining = options.inquiriesRemaining ?? 0;

  switch (state) {
    case 'RECRUITER_SPEAKING':
    case 'WAITING_FOR_CANDIDATE':
      return {
        canMute: true,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: false,
      };

    case 'CANDIDATE_LISTENING':
      return {
        canMute: true,
        canFinishAnswer: true,
        canAskQuestion: inquiriesRemaining > 0,
        canEndInterview: true,
        canRetry: false,
      };

    case 'PROCESSING_ANSWER':
    case 'AI_THINKING':
    case 'GENERATING_NEXT_QUESTION':
    case 'GENERATING_FEEDBACK':
      return {
        canMute: false,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: false,
      };

    case 'ERROR':
      return {
        canMute: false,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: true,
        canRetry: true,
      };

    case 'INTERVIEW_COMPLETED':
    case 'INITIALIZING':
    default:
      return {
        canMute: false,
        canFinishAnswer: false,
        canAskQuestion: false,
        canEndInterview: false,
        canRetry: false,
      };
  }
}

/**
 * ROOM-6: Maps any technical error code to a plain, candidate-friendly message.
 * Strictly guarantees no stack traces, raw SQL, or secret provider keys are exposed.
 */
export function mapRoomErrorMessage(errorCode: string | undefined, defaultMessage?: string): string {
  switch (errorCode) {
    case 'MICROPHONE_DENIED':
      return 'Microphone access was denied. Please allow microphone permissions in your browser settings to continue.';
    case 'MICROPHONE_LOST':
      return 'Microphone was disconnected. Please check your audio device and reconnect.';
    case 'AUDIO_PLAYBACK_FAILED':
      return 'Audio playback failed. Please check your browser audio output or click Replay Question.';
    case 'TRANSCRIPTION_FAILED':
      return 'We could not transcribe your answer clearly. Please check your microphone and try again.';
    case 'TTS_FAILED':
      return 'The AI recruiter voice generation encountered an error. Click Retry to continue.';
    case 'AI_UNAVAILABLE':
    case 'INTERNAL_ERROR':
      return 'The AI interview service is temporarily busy. Click Retry to continue.';
    case 'USER_QUOTA_EXCEEDED':
      return 'Your daily interview quota limit has been reached.';
    case 'GLOBAL_BUDGET_EXHAUSTED':
      return 'Platform interview capacity is currently reached. Please try again tomorrow.';
    case 'NETWORK_LOST':
      return 'Network connection was interrupted. Attempting automatic reconnection...';
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please log in again to continue.';
    default:
      return defaultMessage && !defaultMessage.includes('at ') && !defaultMessage.includes('SELECT')
        ? defaultMessage
        : 'An unexpected issue occurred. Click Retry to continue or End Interview.';
  }
}
