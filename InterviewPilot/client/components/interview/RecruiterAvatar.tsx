'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface RecruiterAvatarProps {
  behavior?: 'listening' | 'thinking';
  isSpeaking?: boolean;
  className?: string;
}

export interface RecruiterAvatarHandle {
  speakAudio: (audioSource: Blob | ArrayBuffer | string) => Promise<void>;
  stopAudio: () => void;
}

export const RecruiterAvatar = forwardRef<RecruiterAvatarHandle, RecruiterAvatarProps>(
  function RecruiterAvatar({ behavior = 'listening', isSpeaking = false, className = '' }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const avatarInstanceRef = useRef<any>(null);
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
            avatarUrl: AVATARS?.female || undefined,
            onError: (err: any) => {
              console.warn('[Avatar SDK Error]', err);
              if (isMounted) setLoadError(err?.message || 'Avatar render failed');
            },
          });

          avatarInstanceRef.current = avatar;
          avatar.setStatus(behavior);
          await avatar.ready;
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
      async speakAudio(audioSource: Blob | ArrayBuffer | string): Promise<void> {
        if (avatarInstanceRef.current && typeof avatarInstanceRef.current.speak === 'function') {
          // VOI-7: Talking Avatar SDK plays audio and drives viseme lip-sync
          return avatarInstanceRef.current.speak(audioSource);
        } else {
          // Fallback: standard HTML5 Audio playback if WebGL is unavailable
          return new Promise<void>((resolve, reject) => {
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
      },
      stopAudio() {
        if (avatarInstanceRef.current && typeof avatarInstanceRef.current.stopSpeaking === 'function') {
          avatarInstanceRef.current.stopSpeaking();
        }
      },
    }));

    return (
      <div
        className={`relative w-full h-full min-h-[300px] flex items-center justify-center bg-slate-950/80 rounded-2xl overflow-hidden border border-slate-800 ${className}`}
        role="region"
        aria-label="AI Recruiter Avatar"
      >
        <div ref={containerRef} className="w-full h-full absolute inset-0 z-10" />

        {/* Polished avatar status and placeholder overlay */}
        {(!isLoaded || loadError) && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-0">
            <div className="relative mb-4">
              <div
                className={`w-28 h-28 rounded-full border-2 flex items-center justify-center text-3xl font-semibold transition-all duration-300 ${
                  isSpeaking
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-400 shadow-lg shadow-indigo-500/20 animate-pulse'
                    : behavior === 'thinking'
                    ? 'border-amber-500 bg-amber-950/40 text-amber-400'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                AI
              </div>
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                  isSpeaking ? 'bg-indigo-500' : behavior === 'thinking' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </div>
            <p className="text-sm font-medium text-slate-200">Sarah (AI Technical Recruiter)</p>
            <p className="text-xs text-slate-400 mt-1 capitalize">
              {isSpeaking ? 'Speaking...' : behavior === 'thinking' ? 'Thinking...' : 'Listening...'}
            </p>
          </div>
        )}
      </div>
    );
  }
);
