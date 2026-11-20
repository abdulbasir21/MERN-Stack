'use client';

import React, { useState } from 'react';
import { Mic, Pause, Play, Volume2, Sparkles, Check } from 'lucide-react';

interface PreviewScenario {
  id: string;
  label: string;
  roomTitle: string;
  timer: string;
  question: string;
  transcript: string;
  starTags: Array<{ label: string; covered: boolean }>;
}

const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: 'junior',
    label: 'Junior Full-Stack',
    roomTitle: 'LIVE REHEARSAL: FULL-STACK DEVELOPER',
    timer: '04:18 / 15:00',
    question:
      'Walk me through a bug or API bottleneck you debugged recently—how did you isolate the root cause and verify the fix?',
    transcript:
      '"On our checkout API, p95 latency spiked under concurrent traffic because of N+1 Prisma queries. I batched the lookups and added an index, cutting response time from 900ms to 85ms..."',
    starTags: [
      { label: 'Situation', covered: true },
      { label: 'Task', covered: true },
      { label: 'Action', covered: true },
      { label: 'Result', covered: true },
    ],
  },
  {
    id: 'intern',
    label: 'Student / Intern',
    roomTitle: 'LIVE REHEARSAL: SOFTWARE INTERN (STAR)',
    timer: '02:45 / 15:00',
    question:
      'Tell me about a class or team project where priorities shifted mid-sprint. How did you align with teammates and deliver on time?',
    transcript:
      '"During our capstone demo week, an external dataset schema changed two days before presentation. I proposed splitting ingestion from UI work..."',
    starTags: [
      { label: 'Situation', covered: true },
      { label: 'Task', covered: true },
      { label: 'Action', covered: true },
      { label: 'Result', covered: false },
    ],
  },
  {
    id: 'senior',
    label: 'Senior Engineer',
    roomTitle: 'LIVE REHEARSAL: SYSTEMS ARCHITECTURE',
    timer: '08:12 / 30:00',
    question:
      'How would you design cache invalidation across read replicas when eventual consistency windows can break billing invariants?',
    transcript:
      '"We pair write-through updates on primary commits with short-TTL read routing for financial mutations, falling back to versioned keys..."',
    starTags: [
      { label: 'Context', covered: true },
      { label: 'Trade-offs', covered: true },
      { label: 'Consistency', covered: true },
      { label: 'Metrics', covered: false },
    ],
  },
];

const WAVEFORM_BARS = [
  { height: 28, delay: '0s' },
  { height: 52, delay: '0.1s' },
  { height: 84, delay: '0.2s' },
  { height: 42, delay: '0.3s' },
  { height: 95, delay: '0.15s' },
  { height: 64, delay: '0.25s' },
  { height: 34, delay: '0.05s' },
  { height: 88, delay: '0.35s' },
  { height: 56, delay: '0.18s' },
  { height: 100, delay: '0.08s' },
  { height: 68, delay: '0.28s' },
  { height: 40, delay: '0.12s' },
  { height: 82, delay: '0.22s' },
  { height: 48, delay: '0.32s' },
  { height: 74, delay: '0.14s' },
  { height: 36, delay: '0.26s' },
  { height: 58, delay: '0.06s' },
  { height: 30, delay: '0.2s' },
];

export function LiveCockpitPreview() {
  const [selectedId, setSelectedId] = useState<string>('junior');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const activeScenario =
    PREVIEW_SCENARIOS.find((s) => s.id === selectedId) ?? PREVIEW_SCENARIOS[0];

  return (
    <div
      id="cockpit-preview"
      className="relative max-w-5xl mx-auto rounded-2xl bg-[#111827]/95 border border-[#334155]/80 p-4 sm:p-6 shadow-[0_0_70px_-18px_rgba(6,182,212,0.3)] backdrop-blur-md text-left"
    >
      {/* Subtle top highlight line */}
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
      />

      {/* Cockpit Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-4 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className={`w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 ${
              isPaused ? '' : 'animate-pulse'
            }`}
          />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#F8FAFC] truncate">
            {activeScenario.roomTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scenario Track Switcher */}
          <div
            role="group"
            aria-label="Preview interview career track"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#0B0F17] border border-[#1E293B]"
          >
            {PREVIEW_SCENARIOS.map((scenario) => {
              const selected = scenario.id === activeScenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedId(scenario.id)}
                  aria-pressed={selected}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono tabular-nums text-cyan-300 px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
            {activeScenario.timer}
          </span>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-[#1E293B] border border-[#334155] text-xs font-medium text-[#CBD5E1] transition-colors"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                <span>Play preview</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                <span>Pause preview</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2-Panel Split Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left: AI Recruiter Avatar */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
              AI Recruiter Avatar
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isPaused ? 'PAUSED' : 'SPEAKING'}</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
            {/* Avatar Gradient Orb with Animated Glow Ring */}
            <div className="relative flex items-center justify-center shrink-0 w-24 h-24">
              <div
                aria-hidden="true"
                data-paused={isPaused ? 'true' : 'false'}
                className="ip-avatar-ring absolute inset-0 rounded-full bg-cyan-400/20 blur-md"
              />
              <div
                aria-hidden="true"
                data-paused={isPaused ? 'true' : 'false'}
                className="ip-avatar-ring absolute inset-1 rounded-full border border-cyan-400/50"
              />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-cyan-600 to-slate-900 border border-cyan-300/40 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/25">
                <Sparkles className="w-7 h-7 text-white mb-0.5" aria-hidden="true" />
                <div className="flex items-center gap-1" aria-hidden="true">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-cyan-200 ${
                      isPaused ? '' : 'animate-bounce [animation-delay:-0.2s]'
                    }`}
                  />
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-cyan-200 ${
                      isPaused ? '' : 'animate-bounce [animation-delay:-0.1s]'
                    }`}
                  />
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-cyan-200 ${
                      isPaused ? '' : 'animate-bounce'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-[#F8FAFC]">
                Alex — AI Recruiter Avatar
              </p>
              <p className="text-xs text-[#CBD5E1]">
                Natural low-latency voice synthesis with real-time avatar lip-sync
              </p>
              <span className="inline-block text-xs font-mono text-cyan-300">
                Follow-up depth adapts to your answer
              </span>
            </div>
          </div>

          <blockquote className="p-3.5 rounded-xl bg-[#111827] border border-[#1E293B] text-xs sm:text-sm text-[#F8FAFC] leading-relaxed">
            &ldquo;{activeScenario.question}&rdquo;
          </blockquote>
        </div>

        {/* Right: Candidate Microphone & Live Transcript Telemetry */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#CBD5E1]">
              <Mic className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              <span className="font-medium">Candidate Microphone Telemetry</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-300">
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full bg-cyan-400 ${
                  isPaused ? '' : 'animate-pulse'
                }`}
              />
              <span>{isPaused ? 'STANDBY' : 'LISTENING'}</span>
            </span>
          </div>

          {/* Animated CSS Keyframe Waveform Bars */}
          <div
            aria-label="Live voice waveform illustration"
            role="img"
            className="h-16 px-3 rounded-xl bg-[#111827] border border-[#1E293B] flex items-center justify-center gap-1.5"
          >
            {WAVEFORM_BARS.map((bar, idx) => (
              <div
                key={idx}
                data-paused={isPaused ? 'true' : 'false'}
                style={{
                  height: `${bar.height}%`,
                  animationDelay: bar.delay,
                }}
                className="ip-waveform-bar w-1.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-300"
              />
            ))}
          </div>

          {/* Mini Live Transcript Line */}
          <div className="p-3 rounded-xl bg-[#111827] border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-[#94A3B8]">
                Transient Speech-to-Text
              </span>
              <span className="font-mono text-cyan-300">0 KB stored</span>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {activeScenario.transcript}
            </p>
          </div>

          {/* STAR Rubric Coverage Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {activeScenario.starTags.map((tag) => (
                <span
                  key={tag.label}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono border ${
                    tag.covered
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : 'bg-[#111827] border-[#334155] text-[#94A3B8]'
                  }`}
                >
                  {tag.covered && <Check className="w-3 h-3" aria-hidden="true" />}
                  <span>{tag.label}</span>
                </span>
              ))}
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-semibold">
              Finish Answer &amp; Submit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
