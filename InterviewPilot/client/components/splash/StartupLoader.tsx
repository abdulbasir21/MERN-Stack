'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './StartupLoader.module.css';

const SESSION_STORAGE_KEY = 'ip_startup_splash_seen';

const SPLASH_GATE_CSS =
  '#ip-startup-loader{position:fixed;inset:0;z-index:9999;background-color:#0B0F17;}';

const SPLASH_GATE_SCRIPT = `try{if(window.location.pathname!=='/'||window.sessionStorage.getItem('${SESSION_STORAGE_KEY}')==='1'){var s=document.getElementById('ip-splash-gate');if(s)s.textContent='#ip-startup-loader{display:none!important;}';}}catch(e){}`;

const WAVEFORM_BARS = [
  { offset: '-48px', enterDelay: '0.02s', pulseDelay: '0.05s' },
  { offset: '-36px', enterDelay: '0.06s', pulseDelay: '0.18s' },
  { offset: '-24px', enterDelay: '0.10s', pulseDelay: '0.08s' },
  { offset: '-12px', enterDelay: '0.14s', pulseDelay: '0.24s' },
  { offset: '0px', enterDelay: '0.16s', pulseDelay: '0.02s' },
  { offset: '12px', enterDelay: '0.14s', pulseDelay: '0.22s' },
  { offset: '24px', enterDelay: '0.10s', pulseDelay: '0.12s' },
  { offset: '36px', enterDelay: '0.06s', pulseDelay: '0.28s' },
  { offset: '48px', enterDelay: '0.02s', pulseDelay: '0.15s' },
];

const SEQUENCE_STEPS = [
  { label: 'SETUP', delay: '2.45s' },
  { label: 'CALIBRATE', delay: '2.85s' },
  { label: 'SIMULATE', delay: '3.25s' },
  { label: 'DEBRIEF', delay: '3.65s' },
] as const;

type LoaderStatus = 'hidden' | 'visible' | 'exiting';

export function StartupLoader() {
  const [status, setStatus] = useState<LoaderStatus>('visible');
  const hasInitializedRef = useRef(false);
  const shouldShowRef = useRef(true);
  const exitTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(
    (exitDurationMs = 450) => {
      clearTimers();
      setStatus((prev) => (prev === 'hidden' ? 'hidden' : 'exiting'));
      unmountTimerRef.current = window.setTimeout(() => {
        setStatus('hidden');
      }, exitDurationMs);
    },
    [clearTimers]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Show once per browser session when entering on the public home page
      let shouldShow = window.location.pathname === '/';

      if (shouldShow) {
        try {
          if (window.sessionStorage.getItem(SESSION_STORAGE_KEY) === '1') {
            shouldShow = false;
          } else {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, '1');
          }
        } catch {
          // Ignore storage access errors in restricted contexts
        }
      }

      shouldShowRef.current = shouldShow;
    }

    if (!shouldShowRef.current) {
      setStatus('hidden');
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    setStatus('visible');

    const exitStartMs = prefersReducedMotion ? 850 : 4550;
    const totalDurationMs = prefersReducedMotion ? 1100 : 5000;

    exitTimerRef.current = window.setTimeout(() => {
      setStatus((prev) => (prev === 'hidden' ? 'hidden' : 'exiting'));
    }, exitStartMs);

    unmountTimerRef.current = window.setTimeout(() => {
      setStatus('hidden');
    }, totalDurationMs);

    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (status === 'hidden') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss(220);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [status, dismiss]);

  if (status === 'hidden') {
    return null;
  }

  return (
    <>
      <style
        id="ip-splash-gate"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SPLASH_GATE_CSS }}
      />
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SPLASH_GATE_SCRIPT }}
      />
      <div
        id="ip-startup-loader"
        role="status"
        aria-live="polite"
        aria-label="Loading InterviewPilot"
        aria-hidden={status === 'exiting'}
        onClick={() => dismiss(250)}
        className={`${styles.overlay} ${status === 'exiting' ? styles.exiting : ''}`}
      >
      <div className={styles.gridBackdrop} aria-hidden="true" />
      <div className={styles.radialGlow} aria-hidden="true" />

      <div className={styles.content}>
        {/* Stages 1 & 2: Microphone waveform converging into IP Logo Orb */}
        <div className={styles.stageCenter} aria-hidden="true">
          <div className={styles.waveCluster}>
            {WAVEFORM_BARS.map((bar, index) => (
              <span
                key={index}
                className={styles.barTrack}
                style={
                  {
                    '--bar-offset': bar.offset,
                    '--enter-delay': bar.enterDelay,
                  } as React.CSSProperties
                }
              >
                <span
                  className={styles.barFill}
                  style={
                    {
                      '--pulse-delay': bar.pulseDelay,
                    } as React.CSSProperties
                  }
                />
              </span>
            ))}
          </div>

          <div className={styles.orbWrapper}>
            <div className={styles.orbGlow} />
            <svg
              viewBox="0 0 100 100"
              className={styles.orbRingSvg}
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                stroke="url(#ipSplashRing)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <defs>
                <linearGradient id="ipSplashRing" x1="0" y1="0" x2="100" y2="100">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity="0.35" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.orbCore}>IP</div>
          </div>
        </div>

        {/* Brand Wordmark */}
        <span className={styles.wordmark}>InterviewPilot</span>

        {/* Stage 3: 4-Node Progress Line */}
        <div className={styles.stepperSection} aria-hidden="true">
          <div className={styles.trackContainer}>
            <div className={styles.trackLine}>
              <div className={styles.trackFill} />
            </div>

            {SEQUENCE_STEPS.map((step) => (
              <div
                key={step.label}
                className={styles.stepItem}
                style={{ '--step-delay': step.delay } as React.CSSProperties}
              >
                <span className={styles.stepDotShell}>
                  <span className={styles.stepDotActive} />
                </span>
                <span className={styles.stepLabelWrap}>
                  <span className={styles.stepLabelBase}>{step.label}</span>
                  <span className={styles.stepLabelLit}>{step.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 4: Tagline */}
        <p className={styles.tagline}>
          Practice smarter. Interview with confidence.
        </p>
      </div>

      {/* Dismiss / Skip Button */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          dismiss(250);
        }}
        className={styles.skipButton}
      >
        <span>Skip</span>
        <span className={styles.skipKeyHint} aria-hidden="true">
          Esc
        </span>
      </button>
      </div>
    </>
  );
}
