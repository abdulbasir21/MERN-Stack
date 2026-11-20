'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  computeRms,
  mapRmsToBarHeights,
  isRecorderAllowed,
  SILENCE_THRESHOLD,
  MAX_RECORDING_SECONDS,
  type InterviewRuntimeState,
} from '@interviewpilot/shared';

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function encodeMonoWav16k(samples: Float32Array, sourceSampleRate: number): ArrayBuffer {
  const targetRate = 16000;
  const ratio = sourceSampleRate > 0 ? sourceSampleRate / targetRate : 1;
  const targetLength = Math.max(1, Math.round(samples.length / ratio));
  const dataBytes = targetLength * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < targetLength; i++) {
    const srcIdx = i * ratio;
    const low = Math.floor(srcIdx);
    const high = Math.min(samples.length - 1, low + 1);
    const frac = srcIdx - low;
    const sample = (samples[low] ?? 0) * (1 - frac) + (samples[high] ?? 0) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767), true);
  }

  return buffer;
}

async function convertBlobToWavIfPossible(
  blob: Blob,
  existingCtx: AudioContext | null
): Promise<Blob> {
  if (!blob || blob.size === 0 || blob.type.includes('wav')) {
    return blob;
  }

  let tempCtx: AudioContext | null = null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = existingCtx || (tempCtx = new AudioCtx());
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (!audioBuffer || audioBuffer.length === 0) {
      return blob;
    }

    const numChannels = audioBuffer.numberOfChannels || 1;
    const mono = new Float32Array(audioBuffer.length);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < audioBuffer.length; i++) {
        mono[i] += channelData[i] / numChannels;
      }
    }

    const wavBuffer = encodeMonoWav16k(mono, audioBuffer.sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch {
    return blob;
  } finally {
    if (tempCtx) {
      tempCtx.close().catch(() => {});
    }
  }
}

export interface UseMicrophoneOptions {
  runtimeState: InterviewRuntimeState;
  onAutoSubmit?: (audioBlob: Blob, durationSeconds: number, isSilenceOnly: boolean) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseMicrophoneReturn {
  hasPermission: boolean;
  isRecording: boolean;
  isMuted: boolean;
  isDisconnected: boolean;
  barHeights: number[];
  recordingDuration: number;
  isSilenceOnly: boolean;
  liveTranscript: string;
  setLiveTranscript: (text: string) => void;
  errorMessage: string | null;
  startRecording: (forceAllow?: boolean) => Promise<void>;
  stopRecording: () => Promise<{ audioBlob: Blob; durationSeconds: number; isSilenceOnly: boolean } | null>;
  toggleMute: () => void;
  requestPermission: () => Promise<boolean>;
  resetRecording: () => void;
}

export function useMicrophone({
  runtimeState,
  onAutoSubmit,
  onError,
}: UseMicrophoneOptions): UseMicrophoneReturn {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDisconnected, setIsDisconnected] = useState<boolean>(false);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(24).fill(4));
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isSilenceOnly, setIsSilenceOnly] = useState<boolean>(true);
  const [liveTranscript, setLiveTranscriptState] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const speechDetectedRef = useRef<boolean>(false);
  const startingRecordingRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  isMutedRef.current = isMuted;
  const liveTranscriptRef = useRef<string>('');
  const sessionBaseTranscriptRef = useRef<string>('');
  const runtimeStateRef = useRef<InterviewRuntimeState>(runtimeState);
  runtimeStateRef.current = runtimeState;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;
  const lastWaveformUpdateRef = useRef<number>(0);

  const setLiveTranscript = useCallback((text: string) => {
    liveTranscriptRef.current = text;
    sessionBaseTranscriptRef.current = text;
    setLiveTranscriptState(text);
    if (text.trim().length > 0) {
      speechDetectedRef.current = true;
      setIsSilenceOnly(false);
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        // Ignore stop errors
      }
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (typeof window === 'undefined' || recognitionRef.current || isMutedRef.current) {
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: BrowserSpeechRecognitionCtor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    };
    const SpeechRecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecCtor) {
      return;
    }

    try {
      const rec = new SpeechRecCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      sessionBaseTranscriptRef.current = liveTranscriptRef.current;

      rec.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalPart = '';
        let interimPart = '';
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript || '';
          if (event.results[i]?.isFinal) {
            finalPart += `${piece} `;
          } else {
            interimPart += piece;
          }
        }

        const base = sessionBaseTranscriptRef.current.trim();
        const combined = [base, finalPart.trim(), interimPart.trim()]
          .filter(Boolean)
          .join(' ');
        if (combined) {
          speechDetectedRef.current = true;
          setIsSilenceOnly(false);
        }
        liveTranscriptRef.current = combined;
        setLiveTranscriptState(combined);
      };

      rec.onerror = () => {
        // Keep audio recording intact even if browser speech API errors/offline
      };

      rec.onend = () => {
        if (recognitionRef.current === rec) {
          recognitionRef.current = null;
          if (
            isRecordingRef.current &&
            !isMutedRef.current &&
            isRecorderAllowed(runtimeStateRef.current)
          ) {
            sessionBaseTranscriptRef.current = liveTranscriptRef.current;
            setTimeout(() => {
              startRecognition();
            }, 150);
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  // VOI-1: Request microphone with echo cancellation & noise suppression
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      if (streamRef.current && streamRef.current.getAudioTracks().some((t) => t.readyState === 'live')) {
        setHasPermission(true);
        setIsDisconnected(false);
        setErrorMessage(null);
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume().catch(() => {});
        }
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setHasPermission(true);
      setIsDisconnected(false);
      setErrorMessage(null);

      // VOI-10: Track disconnection (e.g. microphone unplugged)
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          setIsDisconnected(true);
          setIsRecording(false);
          setErrorMessage('Microphone disconnected. Please reconnect your audio device.');
          onErrorRef.current?.('Microphone disconnected');
        };
      }

      // Initialize Web Audio API AnalyserNode for VOI-8 Waveform
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      return true;
    } catch (err: unknown) {
      setHasPermission(false);
      const msg = err instanceof Error ? err.message : 'Microphone permission denied.';
      setErrorMessage(msg);
      onErrorRef.current?.(msg);
      return false;
    }
  }, []);

  // VOI-8: Waveform update loop driven by AnalyserNode
  const updateWaveform = useCallback(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (!analyserRef.current || isMuted || isDisconnected) {
      // In silence or muted, bars must be flat (VOI-8)
      if (now - lastWaveformUpdateRef.current >= 60) {
        lastWaveformUpdateRef.current = now;
        setBarHeights((prev) => (prev.every((v) => v === 4) ? prev : new Array(24).fill(4)));
      }
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
      return;
    }

    const timeDomainData = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(timeDomainData);

    const rms = computeRms(timeDomainData);
    const SPEECH_RMS_THRESHOLD = 0.002;
    if (rms > SPEECH_RMS_THRESHOLD) {
      speechDetectedRef.current = true;
      setIsSilenceOnly(false);
    }

    if (now - lastWaveformUpdateRef.current >= 60) {
      lastWaveformUpdateRef.current = now;
      const visualRms = rms > SPEECH_RMS_THRESHOLD ? Math.max(rms * 3, 0.025) : rms;
      const bars = mapRmsToBarHeights(visualRms, {
        numBars: 24,
        silenceThreshold: Math.min(SILENCE_THRESHOLD, SPEECH_RMS_THRESHOLD),
      });
      setBarHeights(bars);
    }

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, [isMuted, isDisconnected]);

  // Resume suspended Web Audio context upon any user gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resumeAudioCtx = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', resumeAudioCtx, { passive: true });
    window.addEventListener('keydown', resumeAudioCtx, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', resumeAudioCtx);
      window.removeEventListener('keydown', resumeAudioCtx);
    };
  }, []);

  // Start waveform animation loop once permission is granted
  useEffect(() => {
    if (hasPermission && audioContextRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasPermission, updateWaveform]);

  const startRecording = useCallback(async (forceAllow = false): Promise<void> => {
    // VOI-11: Strictly verify state allows recording unless caller is finishing recruiter turn transition
    if (!forceAllow && !isRecorderAllowed(runtimeStateRef.current)) {
      console.warn(`[VOICE] Recording blocked: runtimeState is ${runtimeStateRef.current}`);
      return;
    }

    if (startingRecordingRef.current || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    startingRecordingRef.current = true;
    try {
      if (!streamRef.current || !streamRef.current.getAudioTracks().some((t) => t.readyState === 'live')) {
        const ok = await requestPermission();
        if (!ok) return;
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {});
      }

      const stream = streamRef.current;
      if (!stream) return;

      recordedChunksRef.current = [];
      speechDetectedRef.current = liveTranscriptRef.current.trim().length > 0;
      setIsSilenceOnly(liveTranscriptRef.current.trim().length === 0);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();

      // Determine supported MIME type for browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(250); // Slice every 250ms
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setIsRecording(true);
      startRecognition();

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }

      // Duration timer with VOI-1 120-second hard limit
      durationTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);

        if (elapsed >= MAX_RECORDING_SECONDS) {
          // VOI-1: 120-second limit reached -> auto stop and submit
          if (durationTimerRef.current) clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
          stopRecognition();
          isRecordingRef.current = false;
          recorder.stop();
          setIsRecording(false);

          setTimeout(() => {
            const rawBlob = new Blob(recordedChunksRef.current, { type: mimeType });
            const silenceOnly = !speechDetectedRef.current && liveTranscriptRef.current.trim().length === 0;
            void convertBlobToWavIfPossible(rawBlob, audioContextRef.current).then((finalBlob) => {
              onAutoSubmitRef.current?.(finalBlob, elapsed, silenceOnly);
            });
          }, 150);
        }
      }, 1000);
    } finally {
      startingRecordingRef.current = false;
    }
  }, [requestPermission, startRecognition, stopRecognition]);

  // VOI-11: Gate recording strictly by runtimeState after React commit
  useEffect(() => {
    if (isRecorderAllowed(runtimeState)) {
      if (mediaRecorderRef.current?.state !== 'recording') {
        startRecording(true).catch(() => {});
      }
    } else if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      stopRecognition();
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [runtimeState, isRecording, startRecording, stopRecognition]);

  const stopRecording = useCallback(async (): Promise<{
    audioBlob: Blob;
    durationSeconds: number;
    isSilenceOnly: boolean;
  } | null> => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    stopRecognition();
    isRecordingRef.current = false;

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const rawBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const elapsed = Math.max(
          1,
          Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
        );
        const silenceOnly = !speechDetectedRef.current && liveTranscriptRef.current.trim().length === 0;

        void convertBlobToWavIfPossible(rawBlob, audioContextRef.current).then((finalBlob) => {
          setIsRecording(false);
          resolve({
            audioBlob: finalBlob,
            durationSeconds: elapsed,
            isSilenceOnly: silenceOnly,
          });
        });
      };
      recorder.stop();
    });
  }, [stopRecognition]);

  // VOI-9: Mute disables track; silence rendering continues
  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      const nextMuted = !track.enabled;
      setIsMuted(nextMuted);
      if (nextMuted) {
        stopRecognition();
      } else if (isRecordingRef.current && isRecorderAllowed(runtimeStateRef.current)) {
        startRecognition();
      }
    }
  }, [startRecognition, stopRecognition]);

  const resetRecording = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    stopRecognition();
    isRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordedChunksRef.current = [];
    liveTranscriptRef.current = '';
    sessionBaseTranscriptRef.current = '';
    setLiveTranscriptState('');
    setIsRecording(false);
    setRecordingDuration(0);
    setIsSilenceOnly(true);
    setBarHeights(new Array(24).fill(4));
  }, [stopRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopRecognition();
      isRecordingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopRecognition]);

  return {
    hasPermission,
    isRecording,
    isMuted,
    isDisconnected,
    barHeights,
    recordingDuration,
    isSilenceOnly,
    liveTranscript,
    setLiveTranscript,
    errorMessage,
    startRecording,
    stopRecording,
    toggleMute,
    requestPermission,
    resetRecording,
  };
}
