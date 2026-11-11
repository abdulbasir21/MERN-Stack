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
  errorMessage: string | null;
  startRecording: () => Promise<void>;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const speechDetectedRef = useRef<boolean>(false);

  // VOI-1: Request microphone with echo cancellation & noise suppression
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
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
          if (onError) onError('Microphone disconnected');
        };
      }

      // Initialize Web Audio API AnalyserNode for VOI-8 Waveform
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
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
      if (onError) onError(msg);
      return false;
    }
  }, [onError]);

  // VOI-8: Waveform update loop driven by AnalyserNode
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || isMuted || isDisconnected) {
      // In silence or muted, bars must be flat (VOI-8)
      setBarHeights(new Array(24).fill(4));
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
      return;
    }

    const timeDomainData = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(timeDomainData);

    const rms = computeRms(timeDomainData);
    if (rms > SILENCE_THRESHOLD) {
      speechDetectedRef.current = true;
      setIsSilenceOnly(false);
    }

    const bars = mapRmsToBarHeights(rms, { numBars: 24, silenceThreshold: SILENCE_THRESHOLD });
    setBarHeights(bars);

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, [isMuted, isDisconnected]);

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

  // VOI-11: Gate recording by runtimeState. If leaving CANDIDATE_LISTENING, stop recorder immediately
  useEffect(() => {
    if (!isRecorderAllowed(runtimeState) && isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  }, [runtimeState, isRecording]);

  const startRecording = useCallback(async (): Promise<void> => {
    // VOI-11: Strictly verify state allows recording
    if (!isRecorderAllowed(runtimeState)) {
      console.warn(`[VOICE] Recording blocked: runtimeState is ${runtimeState}`);
      return;
    }

    if (!hasPermission || !streamRef.current) {
      const ok = await requestPermission();
      if (!ok) return;
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const stream = streamRef.current;
    if (!stream) return;

    recordedChunksRef.current = [];
    speechDetectedRef.current = false;
    setIsSilenceOnly(true);
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
    setIsRecording(true);

    // Duration timer with VOI-1 120-second hard limit
    durationTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      setRecordingDuration(elapsed);

      if (elapsed >= MAX_RECORDING_SECONDS) {
        // VOI-1: 120-second limit reached -> auto stop and submit
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        recorder.stop();
        setIsRecording(false);

        setTimeout(() => {
          const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
          const silenceOnly = !speechDetectedRef.current;
          if (onAutoSubmit) {
            onAutoSubmit(finalBlob, elapsed, silenceOnly);
          }
        }, 150);
      }
    }, 1000);
  }, [runtimeState, hasPermission, requestPermission, onAutoSubmit]);

  const stopRecording = useCallback(async (): Promise<{
    audioBlob: Blob;
    durationSeconds: number;
    isSilenceOnly: boolean;
  } | null> => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const elapsed = Math.max(
          1,
          Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
        );
        const silenceOnly = !speechDetectedRef.current;

        setIsRecording(false);
        resolve({
          audioBlob: finalBlob,
          durationSeconds: elapsed,
          isSilenceOnly: silenceOnly,
        });
      };
      recorder.stop();
    });
  }, []);

  // VOI-9: Mute disables track; silence rendering continues
  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordedChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    setIsSilenceOnly(true);
    setBarHeights(new Array(24).fill(4));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    hasPermission,
    isRecording,
    isMuted,
    isDisconnected,
    barHeights,
    recordingDuration,
    isSilenceOnly,
    errorMessage,
    startRecording,
    stopRecording,
    toggleMute,
    requestPermission,
    resetRecording,
  };
}
