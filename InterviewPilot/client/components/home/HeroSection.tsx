'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { LiveCockpitPreview } from './LiveCockpitPreview';

interface HeroSectionProps {
  startingDemo: boolean;
  demoError: string | null;
  onStartDemo: () => void;
}

const TRUST_HIGHLIGHTS = [
  'Zero Voice Recording or Storage',
  'Real-Time Adaptive Follow-Ups',
  'Instant 5-Min Browser Demo',
];

export function HeroSection({
  startingDemo,
  demoError,
  onStartDemo,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#1E293B]">
      {/* Subtle Grid & Ambient Cyan Glow Background */}
      <div
        aria-hidden="true"
        className="ip-hero-grid absolute inset-0 pointer-events-none opacity-75 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
      />
      <div
        aria-hidden="true"
        className="ip-hero-glow absolute top-28 left-1/2 w-[min(92vw,720px)] h-[360px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono tracking-wider uppercase text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
            <span>AI Mock Interviews for Every Career Stage</span>
          </div>

          {/* Primary Headline (Single H1) */}
          <h1 className="font-sans text-3xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#F8FAFC] leading-[1.16] sm:leading-[1.12]">
            Practice smarter. Interview with{' '}
            <span className="text-cyan-300">real confidence.</span>
          </h1>

          {/* Inclusive Subheading */}
          <p className="text-base sm:text-lg text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed">
            From your first internship to senior technical rounds—rehearse aloud with an
            adaptive AI Recruiter avatar, CV-grounded questions, and structured STAR rubric feedback.
          </p>

          {/* Primary + Ghost/Outline Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
            >
              <span>Start Free Interview</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={onStartDemo}
              disabled={startingDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#111827]/90 hover:bg-[#1E293B] text-[#F8FAFC] text-sm font-semibold border border-[#334155] hover:border-cyan-400/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              <span>{startingDemo ? 'Launching Instant Demo...' : 'Try Instant Demo (No Sign-Up)'}</span>
            </button>
          </div>

          {demoError && (
            <div
              role="alert"
              className="max-w-xl mx-auto mt-3 rounded-xl bg-rose-950/60 border border-rose-500/40 px-4 py-2.5 text-sm text-rose-200"
            >
              {demoError}
            </div>
          )}

          {/* Trust Strip */}
          <ul
            role="list"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pt-3 text-xs sm:text-sm text-[#CBD5E1]"
          >
            {TRUST_HIGHLIGHTS.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Floating Product Visual */}
        <div className="mt-10 sm:mt-12">
          <LiveCockpitPreview />
        </div>
      </div>
    </section>
  );
}
