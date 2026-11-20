'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMicrophone } from '@/hooks/useMicrophone';
import { RecruiterAvatar } from '@/components/interview/RecruiterAvatar';
import { Waveform } from '@/components/interview/Waveform';
import { fetchInterviewStateApi } from '@/lib/api';
import { AppNavbar } from '@/components/navigation/AppNavbar';

export default function DeviceCheckPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [enteringRoom, setEnteringRoom] = useState(false);
  const [interviewRole, setInterviewRole] = useState<string>('Interview');
  const [soundTested, setSoundTested] = useState<boolean>(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Microphone hook in waiting mode to test levels
  const mic = useMicrophone({
    runtimeState: 'WAITING_FOR_CANDIDATE',
  });

  // Verify interview exists and load state
  useEffect(() => {
    let mounted = true;
    async function loadInterview() {
      try {
        const res = await fetchInterviewStateApi(interviewId);
        if (mounted && res.data?.state) {
          setInterviewRole(res.data.state.currentQuestion?.topic || 'Interview Session');
        }
      } catch (err: unknown) {
        if (mounted) {
          const e = err as { message?: string };
          setGeneralError(e.message || 'Failed to load interview session.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadInterview();
    return () => {
      mounted = false;
    };
  }, [interviewId]);

  // Audio output test chime via Web Audio API
  const playTestSound = () => {
    try {
      setIsPlayingTestSound(true);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      setTimeout(() => {
        setIsPlayingTestSound(false);
        setSoundTested(true);
      }, 700);
    } catch {
      setIsPlayingTestSound(false);
    }
  };

  const handleRequestMic = async () => {
    await mic.requestPermission();
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] flex flex-col antialiased">
      {/* Top Header */}
      <AppNavbar
        activeHref="/interviews/setup"
        badgeText={interviewRole}
        rightSlot={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B]">
            <span className="text-xs text-[#94A3B8]">System Verification</span>
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-10 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F8FAFC] mb-2">
            Device Check &amp; Orientation
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Let&apos;s make sure your audio devices are configured properly before your interview begins.
          </p>
        </div>

        {generalError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
            {generalError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Microphone Check */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">Microphone Test</h3>
                    <p className="text-xs text-[#94A3B8]">Voice input &amp; level detection</p>
                  </div>
                </div>
                {mic.hasPermission ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Required
                  </span>
                )}
              </div>

              <p className="text-xs text-[#94A3B8] mb-4">
                We use your microphone with echo cancellation and noise suppression. Speak a few words to test the level.
              </p>

              {/* Live Waveform / Visual Meter */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B] mb-4">
                <Waveform
                  bars={mic.barHeights}
                  isRecording={mic.hasPermission}
                  isMuted={false}
                />
              </div>

              {mic.errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {mic.errorMessage}
                </div>
              )}
            </div>

            {!mic.hasPermission ? (
              <button
                type="button"
                onClick={handleRequestMic}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold tracking-wide transition shadow-lg shadow-cyan-600/20"
              >
                Enable &amp; Test Microphone
              </button>
            ) : (
              <div className="text-xs text-emerald-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Microphone detected and operational.</span>
              </div>
            )}
          </div>

          {/* Card 2: Audio Output Check */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">Speaker / Headphone Test</h3>
                    <p className="text-xs text-[#94A3B8]">Recruiter voice playback</p>
                  </div>
                </div>
                {soundTested ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Verified
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                    Recommended
                  </span>
                )}
              </div>

              <p className="text-xs text-[#94A3B8] mb-6">
                Ensure you can clearly hear the AI recruiter&apos;s spoken questions and follow-ups. Headphones are strongly recommended.
              </p>
            </div>

            <button
              type="button"
              onClick={playTestSound}
              disabled={isPlayingTestSound}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold tracking-wide text-[#F8FAFC] transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              <span>{isPlayingTestSound ? 'Playing chime...' : soundTested ? 'Play Test Chime Again' : 'Play Test Sound'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Avatar Preview & Instructions */}
        <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-1">
              <div className="h-44 w-full rounded-xl overflow-hidden bg-[#0B0F17] border border-[#1E293B] relative">
                <RecruiterAvatar
                  behavior="listening"
                  isSpeaking={false}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-[#F8FAFC] mb-2 flex items-center gap-2">
                <span>AI Recruiter &amp; Room Protocol</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  VOI-11 Compliant
                </span>
              </h3>
              <ul className="text-xs text-[#94A3B8] space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>No webcam required:</strong> InterviewPilot evaluates spoken answers and technical content only. No video stream is recorded or requested.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Turn-taking:</strong> Voice interruption is disabled. Please listen while the recruiter speaks; your microphone becomes active when the recruiter finishes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Need clarification?</strong> During your turn, click &ldquo;Ask a Question&rdquo; to query the recruiter before delivering your final answer.</span>
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex items-center gap-3 text-xs text-[#94A3B8]">
                <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>If your browser blocked the microphone, click the lock icon in your address bar, set Microphone to &ldquo;Allow&rdquo;, and refresh.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enter Room CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition"
          >
            ← Back to Dashboard
          </Link>

          <button
            type="button"
            disabled={!mic.hasPermission || loading || enteringRoom}
            onClick={() => {
              setEnteringRoom(true);
              window.dispatchEvent(
                new CustomEvent('interviewpilot:navigate', {
                  detail: { label: 'Loading Live Interview Room...' },
                })
              );
              router.push(`/interviews/${interviewId}/room`);
            }}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold tracking-wide transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {enteringRoom ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Loading Interview Room...</span>
              </>
            ) : (
              <>
                <span>Enter Interview Room</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
