'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  InterviewStateDto,
  InterviewRuntimeState,
  getRoomButtonStates,
  mapRoomErrorMessage,
} from '@interviewpilot/shared';
import {
  fetchInterviewStateApi,
  startInterviewApi,
  submitAnswerApi,
  submitInquiryApi,
  endInterviewApi,
  retryInterviewApi,
  transcribeAudioApi,
  synthesizeSpeechApi,
  fetchMyProfile,
} from '@/lib/api';
import { useMicrophone } from '@/hooks/useMicrophone';
import { RecruiterAvatar, type RecruiterAvatarHandle } from '@/components/interview/RecruiterAvatar';
import { Waveform } from '@/components/interview/Waveform';

function isCandidateAskingQuestion(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 35) {
    return false;
  }

  const startsLikeQuestion =
    /^(can you|could you|would you|what is|what are|what do you|what does|how do you|how many|how much|should i|do you want|are we|is this|is there|may i ask|can i ask|i have a question|quick question|sorry can|pardon|please repeat|repeat the)\b/i.test(
      trimmed
    );

  return startsLikeQuestion || (trimmed.endsWith('?') && words.length <= 22);
}

export default function LiveInterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  // Interview and Candidate State
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [interviewState, setInterviewState] = useState<InterviewStateDto | null>(null);
  const [runtimeState, setRuntimeState] = useState<InterviewRuntimeState>('INITIALIZING');
  const [activeCaption, setActiveCaption] = useState<string>('Connecting to interview session...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isPreparingSpeech, setIsPreparingSpeech] = useState<boolean>(false);
  const [lastTurnAnalysis, setLastTurnAnalysis] = useState<{
    candidateWords: string;
    mode: 'ANSWER' | 'QUESTION';
    score?: number;
    decision?: string;
    feedback: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [elapsedTimer, setElapsedTimer] = useState<number>(0);

  // Avatar and caption timer refs
  const avatarRef = useRef<RecruiterAvatarHandle | null>(null);
  const captionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // In-flight recording recovery (ROOM-7)
  const lastRecordedBlobRef = useRef<{ blob: Blob; durationSeconds: number; isSilence: boolean } | null>(null);
  const currentRequestIdRef = useRef<string>(crypto.randomUUID());
  const retryCountRef = useRef<number>(0);

  // Forward declarations for submit
  const handleCandidateSubmitRef = useRef<((blob: Blob, duration: number, isSilence: boolean) => Promise<void>) | null>(null);

  // Microphone Hook
  const mic = useMicrophone({
    runtimeState,
    onError: (err) => {
      setErrorMessage(mapRoomErrorMessage('MICROPHONE_LOST', err));
    },
    onAutoSubmit: (blob, duration, isSilence) => {
      // Auto-submit when candidate hits the 120s limit (VOI-1)
      if (handleCandidateSubmitRef.current) {
        handleCandidateSubmitRef.current(blob, duration, isSilence);
      }
    },
  });

  // Calculate button states dynamically based on ROOM-2
  const inquiriesRemaining = interviewState
    ? Math.max(0, interviewState.maxInquiries - interviewState.inquiriesCount)
    : 0;

  const buttonStates = getRoomButtonStates(runtimeState, {
    inquiriesRemaining,
  });

  // Timer: increment elapsed seconds while active
  useEffect(() => {
    if (
      runtimeState === 'INITIALIZING' ||
      runtimeState === 'INTERVIEW_COMPLETED' ||
      interviewState?.isTerminal
    ) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [runtimeState, interviewState?.isTerminal]);

  // Refs to keep initRoom and callbacks free of render-loop dependencies
  const micRef = useRef(mic);
  micRef.current = mic;
  const initializedRef = useRef<string | null>(null);

  const clearCaptionTimer = useCallback(() => {
    if (captionTimerRef.current) {
      clearInterval(captionTimerRef.current);
      captionTimerRef.current = null;
    }
  }, []);

  const revealCaptionProgressively = useCallback(
    (fullText: string, estimatedDurationMs: number) => {
      clearCaptionTimer();
      const words = fullText.trim().split(/\s+/).filter(Boolean);
      if (words.length <= 2) {
        setActiveCaption(fullText);
        return;
      }

      // Sync first words immediately as audio starts, then reveal progressively
      const totalTicks = Math.max(8, Math.min(words.length, Math.floor(estimatedDurationMs / 160)));
      const tickMs = Math.max(80, Math.floor(estimatedDurationMs / totalTicks));
      const wordsPerTick = Math.max(1, Math.ceil(words.length / totalTicks));
      let shownCount = Math.min(words.length, wordsPerTick);
      setActiveCaption(words.slice(0, shownCount).join(' '));

      captionTimerRef.current = setInterval(() => {
        shownCount = Math.min(words.length, shownCount + wordsPerTick);
        setActiveCaption(words.slice(0, shownCount).join(' '));
        if (shownCount >= words.length) {
          clearCaptionTimer();
        }
      }, tickMs);
    },
    [clearCaptionTimer]
  );

  // Recruiter speech and avatar playback (caption waits for audio so both start together)
  const playRecruiterUtterance = useCallback(
    async (text: string) => {
      clearCaptionTimer();
      try {
        setIsPreparingSpeech(true);
        setRuntimeState('AI_THINKING');
        setActiveCaption('');

        const res = await synthesizeSpeechApi({
          text,
          voice: 'Puck',
          interviewId,
        });

        if (res.data?.audioBase64) {
          const byteCharacters = atob(res.data.audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const audioBlob = new Blob([byteArray], { type: res.data.mimeType || 'audio/wav' });

          let estimatedPlaybackMs = Math.max(2500, text.split(/\s+/).length * 420);
          if (byteArray.length >= 44) {
            const view = new DataView(byteArray.buffer, byteArray.byteOffset, byteArray.byteLength);
            const sampleRate = view.getUint32(24, true);
            const byteRate = view.getUint32(28, true);
            if (sampleRate !== 16000 && byteRate > 0) {
              estimatedPlaybackMs = Math.max(1800, Math.round(((byteArray.length - 44) / byteRate) * 1000));
            }
          }

          setIsPreparingSpeech(false);
          setRuntimeState('RECRUITER_SPEAKING');
          revealCaptionProgressively(text, estimatedPlaybackMs);

          if (avatarRef.current) {
            await avatarRef.current.speakAudio(audioBlob, text);
          } else {
            await new Promise((resolve) => setTimeout(resolve, estimatedPlaybackMs));
          }
        } else {
          setIsPreparingSpeech(false);
          setRuntimeState('RECRUITER_SPEAKING');
          const durationMs = Math.max(2500, text.length * 50);
          revealCaptionProgressively(text, durationMs);
          await new Promise((resolve) => setTimeout(resolve, durationMs));
        }
      } catch {
        setIsPreparingSpeech(false);
        setRuntimeState('RECRUITER_SPEAKING');
        const durationMs = Math.max(2500, text.split(/\s+/).length * 420);
        revealCaptionProgressively(text, durationMs);

        // Fall back to browser speech synthesis if API or WebGL playback fails
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          await new Promise<void>((resolve) => {
            const safetyTimer = setTimeout(resolve, Math.min(20000, durationMs + 3000));
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.pitch = 0.92;
              const voices = window.speechSynthesis.getVoices();
              const maleVoice = voices.find(
                (v) =>
                  /en/i.test(v.lang) &&
                  /Male|David|Mark|Guy|Daniel|George|Alex|James/i.test(v.name) &&
                  !/Female|Zira|Hazel|Samantha|Victoria/i.test(v.name)
              );
              if (maleVoice) {
                utterance.voice = maleVoice;
              }
              utterance.onend = () => {
                clearTimeout(safetyTimer);
                resolve();
              };
              utterance.onerror = () => {
                clearTimeout(safetyTimer);
                resolve();
              };
              window.speechSynthesis.speak(utterance);
            } catch {
              clearTimeout(safetyTimer);
              resolve();
            }
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, durationMs));
        }
      } finally {
        clearCaptionTimer();
        setIsPreparingSpeech(false);
        setActiveCaption(text);
        // When speech finishes, hand over turn to candidate (useMicrophone auto-starts recording on CANDIDATE_LISTENING)
        setRuntimeState('CANDIDATE_LISTENING');
      }
    },
    [clearCaptionTimer, interviewId, revealCaptionProgressively]
  );

  const playRecruiterUtteranceRef = useRef(playRecruiterUtterance);
  playRecruiterUtteranceRef.current = playRecruiterUtterance;

  // Core Submit Handler (ROOM-3, ROOM-7, QTA-12)
  const handleCandidateSubmit = useCallback(
    async (
      audioBlob: Blob,
      durationSeconds: number,
      isSilenceOnly: boolean
    ) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setErrorMessage(null);

      const spokenOrTypedText = micRef.current.liveTranscript.trim();
      const effectiveSilenceOnly =
        audioBlob.size > 500 || spokenOrTypedText.length > 0 ? false : isSilenceOnly;
      let effectiveDuration =
        spokenOrTypedText.length > 0 ? Math.max(2, durationSeconds) : durationSeconds;

      // Store in-memory for 3-attempt idempotent retry (ROOM-7)
      lastRecordedBlobRef.current = {
        blob: audioBlob,
        durationSeconds: effectiveDuration,
        isSilence: effectiveSilenceOnly,
      };

      try {
        setRuntimeState('PROCESSING_ANSWER');

        // 1. Transcribe audio via Gemini Audio Model (merge with browser live transcript)
        let transcript = '';
        let isEmpty = false;
        if ((!audioBlob || audioBlob.size === 0) && spokenOrTypedText.length === 0) {
          isEmpty = true;
        } else if (audioBlob && audioBlob.size > 0) {
          const transcribeRes = await transcribeAudioApi({
            audioBlob,
            durationSeconds: effectiveDuration,
            interviewId,
            isSilenceOnly: effectiveSilenceOnly,
          });
          const serverTranscript = (transcribeRes.data.transcript || '').trim();
          transcript =
            serverTranscript.length >= spokenOrTypedText.length
              ? serverTranscript
              : spokenOrTypedText;
          isEmpty = transcript.trim().length === 0 ? transcribeRes.data.isEmpty : false;
        } else {
          transcript = spokenOrTypedText;
          isEmpty = transcript.trim().split(/\s+/).filter(Boolean).length < 2;
        }

        if (transcript.trim().length > 0) {
          isEmpty = false;
          effectiveDuration = Math.max(2, effectiveDuration);
          micRef.current.setLiveTranscript(transcript);
        }

        // Check whether candidate clicked Ask a Question OR clearly asked a clarifying question aloud
        const inquiriesLeft = Math.max(
          0,
          (interviewState?.maxInquiries || 2) - (interviewState?.inquiriesCount || 0)
        );
        const isQuestionTurn =
          interviewState?.listeningMode === 'QUESTION' ||
          (!isEmpty && inquiriesLeft > 0 && isCandidateAskingQuestion(transcript));

        if (isQuestionTurn) {
          // Submit candidate inquiry (ROOM-3, ENG-10)
          const inquiryText = transcript.trim() || 'Could you please clarify this question?';
          const inquiryRes = await submitInquiryApi(
            interviewId,
            { inquiry: inquiryText },
            currentRequestIdRef.current
          );

          setLastTurnAnalysis({
            candidateWords: inquiryText,
            mode: 'QUESTION',
            feedback: inquiryRes.data.reply,
          });
          setInterviewState(inquiryRes.data.state);
          micRef.current.setLiveTranscript('');
          currentRequestIdRef.current = crypto.randomUUID();
          retryCountRef.current = 0;
          lastRecordedBlobRef.current = null;

          // Recruiter speaks the reply, then restores pending question
          await playRecruiterUtterance(inquiryRes.data.reply);
        } else {
          // Submit candidate answer
          const answerRes = await submitAnswerApi(
            interviewId,
            {
              transcript,
              isEmpty,
              durationSeconds: effectiveDuration,
            },
            currentRequestIdRef.current
          );

          const nextState = answerRes.data.state;
          setLastTurnAnalysis({
            candidateWords:
              transcript.trim() ||
              '(No speech detected — please speak clearly or type in the box above)',
            mode: 'ANSWER',
            score: answerRes.data.evaluation.overallScore,
            decision: answerRes.data.decision,
            feedback: answerRes.data.evaluation.summaryFeedback,
          });
          setInterviewState(nextState);
          micRef.current.setLiveTranscript('');

          currentRequestIdRef.current = crypto.randomUUID();
          retryCountRef.current = 0;
          lastRecordedBlobRef.current = null;

          if (nextState.isTerminal || nextState.status === 'COMPLETED' || nextState.status === 'TIMED_OUT') {
            router.push(`/interviews/${interviewId}/report`);
            return;
          }

          // Play next question or closing utterance
          const nextUtterance =
            nextState.recruiterUtterance ||
            nextState.currentQuestion?.text ||
            'Thank you. Preparing the next question.';

          await playRecruiterUtterance(nextUtterance);
        }
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        setRuntimeState('ERROR');
        setErrorMessage(mapRoomErrorMessage(e.code, e.message));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      interviewId,
      interviewState?.inquiriesCount,
      interviewState?.listeningMode,
      interviewState?.maxInquiries,
      isSubmitting,
      playRecruiterUtterance,
      router,
    ]
  );

  handleCandidateSubmitRef.current = handleCandidateSubmit;

  // Initial load / Reload recovery (ROOM-1, ROOM-5)
  useEffect(() => {
    if (initializedRef.current === interviewId) {
      return;
    }
    initializedRef.current = interviewId;
    let isMounted = true;

    async function initRoom() {
      try {
        // Request microphone permission up front before speech/recording transitions
        await micRef.current.requestPermission();

        // 1. Fetch user profile for candidate name
        try {
          const profileRes = await fetchMyProfile();
          if (isMounted && profileRes.data?.user?.profile?.fullName) {
            setCandidateName(profileRes.data.user.profile.fullName);
          }
        } catch {
          // ignore profile fetch error
        }

        // 2. Fetch current interview state
        const stateRes = await fetchInterviewStateApi(interviewId);
        const state = stateRes.data.state;

        if (!isMounted) return;

        if (state.isTerminal || state.status === 'COMPLETED' || state.status === 'ENDED_EARLY' || state.status === 'TIMED_OUT') {
          router.replace(`/interviews/${interviewId}/report`);
          return;
        }

        setInterviewState(state);
        setElapsedTimer(state.elapsedSeconds || 0);

        // Check if interview needs to be started from CREATED
        if (state.status === 'CREATED') {
          const startRes = await startInterviewApi(interviewId);
          const startedState = startRes.data.state;
          if (!isMounted) return;
          setInterviewState(startedState);
          setRuntimeState(startedState.runtimeState);

          const promptText =
            startedState.recruiterUtterance ||
            startedState.currentQuestion?.text ||
            'Welcome. Let us begin your interview.';

          await playRecruiterUtteranceRef.current(promptText);
        } else {
          // ROOM-5: Reload recovery - restore caption and speak if recruiter/listening turn
          const caption =
            state.recruiterUtterance ||
            state.currentQuestion?.text ||
            'Welcome back. Please proceed with your answer.';
          setActiveCaption(caption);
          if (state.runtimeState === 'RECRUITER_SPEAKING' || state.runtimeState === 'CANDIDATE_LISTENING') {
            await playRecruiterUtteranceRef.current(caption);
          } else {
            setRuntimeState(state.runtimeState);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const e = err as { code?: string; message?: string };
          setRuntimeState('ERROR');
          setErrorMessage(mapRoomErrorMessage(e.code, e.message));
        }
      }
    }

    initRoom();

    return () => {
      isMounted = false;
      initializedRef.current = null;
      clearCaptionTimer();
    };
  }, [clearCaptionTimer, interviewId, router]);

  // "Finish Answer" button click
  const handleFinishAnswer = async () => {
    const capturedLiveText = mic.liveTranscript.trim();
    const result = await mic.stopRecording();
    if (result) {
      await handleCandidateSubmit(result.audioBlob, result.durationSeconds, result.isSilenceOnly);
    } else {
      await handleCandidateSubmit(
        new Blob([]),
        capturedLiveText.length > 0 ? Math.max(2, mic.recordingDuration || 3) : 0,
        capturedLiveText.length === 0
      );
    }
  };

  // ROOM-3: "Ask a Question" button click
  const handleAskQuestion = async () => {
    if (!buttonStates.canAskQuestion) return;

    // Discard unsent recording and restart in QUESTION mode
    mic.resetRecording();
    if (interviewState) {
      setInterviewState({
        ...interviewState,
        listeningMode: 'QUESTION',
      });
    }

    // Restart recording for candidate's inquiry
    await mic.startRecording();
  };

  // ROOM-5: "Replay Question" button click (costs 1 TTS call)
  const handleReplayQuestion = async () => {
    if (isReplaying || !interviewState?.currentQuestion?.text) return;
    setIsReplaying(true);
    try {
      await playRecruiterUtterance(interviewState.currentQuestion.text);
    } finally {
      setIsReplaying(false);
    }
  };

  // ROOM-7: Retry failed submission (up to 3 times with same clientRequestId)
  const handleRetry = async () => {
    if (retryCountRef.current >= 3) {
      setErrorMessage('Network or server error persists. Please click End Interview to save your progress.');
      return;
    }

    retryCountRef.current += 1;
    setErrorMessage(null);

    if (lastRecordedBlobRef.current) {
      await handleCandidateSubmit(
        lastRecordedBlobRef.current.blob,
        lastRecordedBlobRef.current.durationSeconds,
        lastRecordedBlobRef.current.isSilence
      );
    } else {
      try {
        const retryRes = await retryInterviewApi(interviewId);
        setInterviewState(retryRes.data.state);
        setRuntimeState(retryRes.data.state.runtimeState);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        setRuntimeState('ERROR');
        setErrorMessage(mapRoomErrorMessage(e.code, e.message));
      }
    }
  };

  // ROOM-4: "End Interview" confirmation & submission
  const handleConfirmEndInterview = async () => {
    setIsEnding(true);
    try {
      await endInterviewApi(interviewId);
      router.push(`/interviews/${interviewId}/report`);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setErrorMessage(mapRoomErrorMessage(e.code, e.message));
      setIsEnding(false);
      setShowEndModal(false);
    }
  };

  // Format mm:ss timer helper
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Runtime State Badge Label and Colors
  const getBadgeConfig = () => {
    if (isPreparingSpeech) {
      return {
        label: 'Preparing Audio & Reply...',
        color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse',
      };
    }
    switch (runtimeState) {
      case 'RECRUITER_SPEAKING':
        return { label: 'Recruiter Speaking', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'PROCESSING_ANSWER':
      case 'AI_THINKING':
      case 'GENERATING_NEXT_QUESTION':
        return { label: 'Recruiter Thinking...', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' };
      case 'CANDIDATE_LISTENING':
        return {
          label: interviewState?.listeningMode === 'QUESTION' ? 'Listening to Inquiry' : 'Listening to Candidate',
          color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
      case 'ERROR':
        return { label: 'System Error', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default:
        return { label: 'Preparing', color: 'bg-[#1E293B] text-[#94A3B8] border-[#334155]' };
    }
  };

  const badge = getBadgeConfig();

  const avatarBehavior = runtimeState === 'PROCESSING_ANSWER' || runtimeState === 'AI_THINKING' || runtimeState === 'GENERATING_NEXT_QUESTION'
    ? 'thinking'
    : 'listening';

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#0B0F17] text-[#F8FAFC] flex flex-col lg:overflow-hidden select-none antialiased">
      {/* TOP HUD BAR */}
      <header className="min-h-14 py-2 bg-[#111827]/90 backdrop-blur-md px-3 sm:px-6 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-[#1E293B] z-20">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 pr-0 sm:pr-4 sm:border-r sm:border-[#1E293B]">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
              IP
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#F8FAFC] hidden xs:inline sm:inline">InterviewPilot</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-[#94A3B8] font-medium">Session ID:</span>
            <span className="text-xs font-mono text-[#64748B]">{interviewId.slice(0, 8)}</span>
          </div>
        </div>

        {/* Center: Live Timer and Question Counter */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs text-[#64748B] uppercase tracking-wider font-semibold">Elapsed:</span>
            <span className="font-mono text-xs sm:text-sm font-semibold text-cyan-400 tabular-nums">
              {formatTimer(elapsedTimer)}
            </span>
          </div>

          {interviewState && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-[#64748B] uppercase tracking-wider font-semibold hidden sm:inline">Progress:</span>
              <span className="text-xs font-semibold text-[#F8FAFC] font-mono">
                Q{interviewState.questionsAsked}/{interviewState.maxQuestions}
              </span>
            </div>
          )}
        </div>

        {/* Right: End Interview CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowEndModal(true)}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold tracking-wide transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">End Interview</span>
            <span className="sm:hidden">End</span>
          </button>
        </div>
      </header>

      {/* ERROR BANNER IF ACTIVE */}
      {errorMessage && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          {buttonStates.canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* MAIN VIEWPORT: 2-PANEL COCKPIT */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 overflow-y-auto lg:overflow-hidden">
        {/* LEFT PANEL: AI Recruiter (7 of 12 cols on desktop) */}
        <section className="lg:col-span-7 flex flex-col rounded-2xl bg-[#111827] border border-[#1E293B] overflow-hidden shadow-2xl relative min-h-[280px] sm:min-h-[360px] lg:min-h-0">
          {/* Avatar Area */}
          <div className="flex-1 relative bg-[#0B0F17] flex items-center justify-center overflow-hidden min-h-[200px] sm:min-h-[260px] lg:min-h-0">
            <RecruiterAvatar
              ref={avatarRef}
              behavior={avatarBehavior}
              isSpeaking={runtimeState === 'RECRUITER_SPEAKING'}
              isPreparingSpeech={isPreparingSpeech}
            />

            {/* Floating Top Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                <span>{badge.label}</span>
              </span>
            </div>

            {/* Replay Question Button (ROOM-5) */}
            {runtimeState === 'CANDIDATE_LISTENING' && interviewState?.currentQuestion && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={handleReplayQuestion}
                  disabled={isReplaying}
                  className="px-3 py-1 rounded-full bg-[#1E293B]/80 hover:bg-[#334155] border border-[#334155] text-xs text-[#F8FAFC] transition flex items-center gap-1.5 backdrop-blur-md"
                >
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{isReplaying ? 'Replaying...' : 'Replay question'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Subtitle / Caption Bar */}
          <div className="p-4 bg-[#111827] border-t border-[#1E293B] flex items-center justify-between min-h-[84px]">
            <div className="flex-1 pr-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] mb-1">
                Recruiter Utterance
              </div>
              {isPreparingSpeech ? (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.1s]"></span>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"></span>
                  </div>
                  <span className="text-sm text-cyan-300 font-medium animate-pulse">
                    Generating recruiter voice &amp; lip-sync...
                  </span>
                </div>
              ) : (
                <p className="text-sm text-[#F8FAFC] font-medium leading-relaxed">
                  {activeCaption}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Candidate Telemetry & Pinned Action Dock (5 of 12 cols on desktop) */}
        <section className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#111827] border border-[#1E293B] p-3.5 sm:p-4 gap-3 shadow-2xl lg:overflow-hidden min-h-0">
          {/* Scrollable Telemetry & Analysis Region */}
          <div className="flex-1 lg:overflow-y-auto lg:pr-1 space-y-2.5 min-h-0">
            {/* Header: Candidate Details & Inquiries Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-sm text-white">
                  {candidateName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">{candidateName}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${mic.isMuted ? 'bg-amber-400' : mic.isRecording ? 'bg-cyan-400 animate-pulse' : 'bg-[#64748B]'}`}></span>
                    <span className="text-xs text-[#94A3B8]">
                      {mic.isMuted ? 'Muted' : mic.isRecording ? 'Microphone Active' : 'Microphone Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remaining Inquiries Badge */}
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748B] block">
                  Clarifications Left
                </span>
                <span className="text-xs font-semibold text-cyan-400">
                  {inquiriesRemaining} / {interviewState?.maxInquiries || 2}
                </span>
              </div>
            </div>

            {/* Listening Mode Callout */}
            <div>
              {interviewState?.listeningMode === 'QUESTION' ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Inquiry Mode: Ask your question. Click Finish Answer when done.</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Candidate Response Mode</span>
                  <span className="font-mono text-cyan-400">{formatTimer(mic.recordingDuration)} / 02:00</span>
                </div>
              )}
            </div>

            {/* Real-time Waveform */}
            <div className="p-2.5 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] mb-1.5 flex items-center justify-between">
                <span>Microphone Telemetry</span>
                <span>{mic.isMuted ? 'MUTED' : mic.isRecording ? 'LIVE' : 'STANDBY'}</span>
              </div>
              <Waveform
                bars={mic.barHeights}
                isRecording={mic.isRecording}
                isMuted={mic.isMuted}
              />
            </div>

            {/* Candidate Live Voice Transcript & Editable Response Box */}
            <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                  Your Answer (Live Voice Transcript / Text)
                </span>
                <div className="flex items-center gap-2">
                  {buttonStates.canFinishAnswer && !isSubmitting && (
                    <button
                      type="button"
                      onClick={handleFinishAnswer}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm"
                    >
                      ✓ Finish Answer
                    </button>
                  )}
                  {mic.isRecording && !mic.isMuted ? (
                    <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                      ● Transcribing Speech
                    </span>
                  ) : runtimeState === 'CANDIDATE_LISTENING' && !isSubmitting ? (
                    <button
                      type="button"
                      onClick={() => {
                        mic.startRecording(true).catch(() => {});
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition"
                    >
                      Start / Resume Mic
                    </button>
                  ) : null}
                </div>
              </div>
              <textarea
                value={mic.liveTranscript}
                onChange={(e) => mic.setLiveTranscript(e.target.value)}
                disabled={runtimeState !== 'CANDIDATE_LISTENING' || isSubmitting}
                rows={2}
                placeholder={
                  runtimeState === 'CANDIDATE_LISTENING'
                    ? 'Speak into your microphone (your live words appear here) or type/refine your answer...'
                    : 'Waiting for Alex (AI Recruiter) to finish speaking before your microphone opens...'
                }
                className="w-full rounded-lg bg-[#111827] border border-[#1E293B] focus:border-cyan-500/60 focus:outline-none px-3 py-2 text-xs text-[#F8FAFC] placeholder:text-[#64748B] resize-none disabled:opacity-60"
              />
            </div>

            {/* Compact Last Turn Recognition & AI Recruiter Feedback */}
            {lastTurnAnalysis && (
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/25 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                    Last Turn Analysis
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    {lastTurnAnalysis.mode === 'QUESTION'
                      ? 'Clarifying Question Answered'
                      : `Answer Analyzed • Score: ${lastTurnAnalysis.score ?? 0}/100`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  <strong className="text-cyan-300">Your Words:</strong>{' '}
                  &ldquo;{lastTurnAnalysis.candidateWords}&rdquo;
                </p>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  <strong className="text-indigo-200">AI Recruiter Analysis:</strong>{' '}
                  {lastTurnAnalysis.feedback}
                </p>
              </div>
            )}
          </div>

          {/* Pinned Non-Scrolling Action Dock (Governed strictly by getRoomButtonStates) */}
          <div className="shrink-0 space-y-2.5 pt-3 mt-2 border-t border-[#1E293B] bg-[#111827]">
            {/* Primary Finish Answer Button Promoted on Top */}
            <button
              type="button"
              onClick={handleFinishAnswer}
              disabled={!buttonStates.canFinishAnswer || isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 hover:from-emerald-400 hover:via-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold tracking-wide transition shadow-xl shadow-cyan-500/25 ring-2 ring-cyan-400/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Transcribing &amp; Analyzing Your Words...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Finish Answer &amp; Submit</span>
                </>
              )}
            </button>

            {/* Secondary Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Mute Button */}
              <button
                type="button"
                onClick={mic.toggleMute}
                disabled={!buttonStates.canMute}
                className="py-2 px-4 rounded-xl bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 disabled:cursor-not-allowed border border-[#334155] text-xs font-semibold text-[#F8FAFC] transition flex items-center justify-center gap-2"
              >
                {mic.isMuted ? (
                  <>
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 19L5 5m14 0l-3.5 3.5M9.88 9.88A3 3 0 0012 14c1.66 0 3-1.34 3-3V5m-4.5 9.5L12 19m0 0H8m4 0h4" />
                    </svg>
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Mute Mic</span>
                  </>
                )}
              </button>

              {/* Ask a Question Button (ROOM-3) */}
              <button
                type="button"
                onClick={handleAskQuestion}
                disabled={!buttonStates.canAskQuestion}
                className="py-2 px-4 rounded-xl bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 disabled:cursor-not-allowed border border-[#334155] text-xs font-semibold text-[#F8FAFC] transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ask a Question</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* CONFIRM END INTERVIEW MODAL (ROOM-4) */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-[#F8FAFC] mb-2">
              End Interview Early?
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-6">
              Are you sure you want to conclude this interview? Unused AI reservations will be released. If you have answered at least one question, a performance report will be generated.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                disabled={isEnding}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-[#F8FAFC] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndInterview}
                disabled={isEnding}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold tracking-wide transition shadow-lg shadow-rose-600/20"
              >
                {isEnding ? 'Ending session...' : 'Yes, End Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
