'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface RecruiterAvatarProps {
  behavior?: 'listening' | 'thinking';
  isSpeaking?: boolean;
  isPreparingSpeech?: boolean;
  className?: string;
}

export interface RecruiterAvatarHandle {
  speakAudio: (audioSource: Blob | ArrayBuffer | string, fallbackText?: string) => Promise<void>;
  stopAudio: () => void;
}

export const RecruiterAvatar = forwardRef<RecruiterAvatarHandle, RecruiterAvatarProps>(
  function RecruiterAvatar(
    { behavior = 'listening', isSpeaking = false, isPreparingSpeech = false, className = '' },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const avatarInstanceRef = useRef<any>(null);
    const avatarReadyPromiseRef = useRef<Promise<void> | null>(null);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
      let isMounted = true;

      async function initAvatar() {
        if (!containerRef.current || typeof window === 'undefined') return;

        try {
          // Dynamic import to prevent SSR issues with WebGL / window
          const { TalkingAvatar, AVATARS } = await import('@interviewflowai/talking-avatar');

          if (!isMounted || !containerRef.current) return;

          const avatar = new TalkingAvatar({
            container: containerRef.current,
            avatarUrl: AVATARS?.male || undefined,
            onError: (err: any) => {
              console.warn('[Avatar SDK Error]', err);
              if (isMounted) setLoadError(err?.message || 'Avatar render failed');
            },
          });

          avatarInstanceRef.current = avatar;
          avatar.setStatus(behavior);
          avatarReadyPromiseRef.current = Promise.resolve(avatar.ready);
          await avatarReadyPromiseRef.current;
          if (isMounted) setIsLoaded(true);
        } catch (err: unknown) {
          console.warn('[Avatar Init]', err);
          if (isMounted) {
            setLoadError('Talking Avatar running in fallback mode.');
          }
        }
      }

      initAvatar();

      return () => {
        isMounted = false;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (avatarInstanceRef.current) {
          try {
            avatarInstanceRef.current.dispose?.();
          } catch {
            // Ignore cleanup errors
          }
          avatarInstanceRef.current = null;
        }
      };
    }, []);

    // Update behavior ('listening' | 'thinking')
    useEffect(() => {
      if (avatarInstanceRef.current && typeof avatarInstanceRef.current.setStatus === 'function') {
        avatarInstanceRef.current.setStatus(behavior);
      }
    }, [behavior]);

    // Expose speakAudio and stopAudio via ref
    useImperativeHandle(ref, () => ({
      async speakAudio(
        audioSource: Blob | ArrayBuffer | string,
        fallbackText?: string
      ): Promise<void> {
        let buffer: ArrayBuffer | null = null;
        if (audioSource instanceof Blob) {
          buffer = await audioSource.arrayBuffer();
        } else if (audioSource instanceof ArrayBuffer) {
          buffer = audioSource;
        }

        // Detect 16kHz formant fallback WAV generated when Gemini TTS is unavailable
        let isFallbackWav = false;
        if (buffer && buffer.byteLength >= 44) {
          const view = new DataView(buffer);
          const riff = String.fromCharCode(
            view.getUint8(0),
            view.getUint8(1),
            view.getUint8(2),
            view.getUint8(3)
          );
          const sampleRate = view.getUint32(24, true);
          if (riff === 'RIFF' && sampleRate === 16000) {
            isFallbackWav = true;
          }
        }

        const runPlayback = async () => {
          if (avatarReadyPromiseRef.current) {
            await Promise.race([
              avatarReadyPromiseRef.current.catch(() => {}),
              new Promise<void>((r) => setTimeout(r, 3000)),
            ]);
          }
          if (avatarInstanceRef.current && typeof avatarInstanceRef.current.speak === 'function') {
            // VOI-7: Talking Avatar SDK plays audio and drives viseme lip-sync
            await avatarInstanceRef.current.speak(buffer ?? audioSource);
          } else {
            // Fallback: standard HTML5 Audio playback if WebGL is unavailable
            await new Promise<void>((resolve, reject) => {
              const url =
                audioSource instanceof Blob
                  ? URL.createObjectURL(audioSource)
                  : typeof audioSource === 'string'
                  ? audioSource
                  : URL.createObjectURL(new Blob([audioSource], { type: 'audio/wav' }));

              const audio = new Audio(url);
              audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              audio.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
              };
              audio.play().catch(reject);
            });
          }
        };

        if (
          isFallbackWav &&
          fallbackText &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window
        ) {
          window.speechSynthesis.cancel();
          const utterancePromise = new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(fallbackText);
            utterance.rate = 1.0;
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
              try {
                avatarInstanceRef.current?.stopSpeaking?.();
              } catch {
                // Ignore cleanup errors
              }
              resolve();
            };
            utterance.onerror = () => {
              try {
                avatarInstanceRef.current?.stopSpeaking?.();
              } catch {
                // Ignore cleanup errors
              }
              resolve();
            };
            window.speechSynthesis.speak(utterance);
          });

          await Promise.all([runPlayback().catch(() => {}), utterancePromise]);
          return;
        }

        return runPlayback();
      },
      stopAudio() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (avatarInstanceRef.current && typeof avatarInstanceRef.current.stopSpeaking === 'function') {
          avatarInstanceRef.current.stopSpeaking();
        }
      },
    }));

    return (
      <div
        className={`relative w-full h-full min-h-[200px] sm:min-h-[260px] lg:min-h-[300px] flex items-center justify-center bg-slate-950/80 rounded-2xl overflow-hidden border border-slate-800 ${className}`}
        role="region"
        aria-label="AI Recruiter Avatar"
      >
        <div ref={containerRef} className="w-full h-full absolute inset-0 z-10" />

        {/* Polished avatar status and placeholder overlay */}
        <AnimatePresence>
          {(!isLoaded || loadError) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center p-6 text-center z-0"
            >
              <div className="relative mb-4">
                <motion.div
                  animate={isSpeaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  transition={isSpeaking ? { repeat: Infinity, duration: 1.5 } : {}}
                  className={`w-28 h-28 rounded-full border-2 flex items-center justify-center text-3xl font-semibold transition-all duration-300 ${
                    isSpeaking
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-400 shadow-xl shadow-cyan-500/20'
                      : behavior === 'thinking'
                      ? 'border-amber-500 bg-amber-950/40 text-amber-400'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  AI
                </motion.div>
                <span
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                    isSpeaking ? 'bg-cyan-500' : behavior === 'thinking' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
              <p className="text-sm font-medium text-slate-200">Alex (AI Technical Recruiter)</p>
              <p className="text-xs text-slate-400 mt-1 capitalize font-mono">
                {isSpeaking ? 'Speaking...' : behavior === 'thinking' ? 'Evaluating turn...' : 'Listening...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated voice-synthesis loader overlay while audio + visemes are being prepared */}
        <AnimatePresence>
          {isPreparingSpeech && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-500/15 flex items-center gap-3"
            >
              <div className="flex items-end gap-1 h-4" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <motion.span
                    key={idx}
                    animate={{ height: ['4px', '14px', '6px'] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.75,
                      delay: idx * 0.12,
                      ease: 'easeInOut',
                    }}
                    className="w-1 rounded-full bg-cyan-400"
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-cyan-200 tracking-wide whitespace-nowrap">
                Synthesizing AI Recruiter Voice...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
