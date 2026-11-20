'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';

interface FinalCtaSectionProps {
  startingDemo: boolean;
  onStartDemo: () => void;
}

export function FinalCtaSection({
  startingDemo,
  onStartDemo,
}: FinalCtaSectionProps) {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1E293B] bg-[#0E1524]/60">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111827] via-[#0E1726] to-[#0B0F17] border border-cyan-500/30 p-8 sm:p-12 md:p-14 text-center shadow-[0_0_60px_-20px_rgba(6,182,212,0.3)]">
          <div
            aria-hidden="true"
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-cyan-500/15 rounded-full blur-[90px] pointer-events-none"
          />

          <div className="relative max-w-2xl mx-auto space-y-5">
            <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-semibold">
              Start Practicing Today
            </p>
            <h2 className="font-sans text-2xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
              Walk into your next interview prepared to answer clearly
            </h2>
            <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
              Run a 5-minute voice rehearsal right now with zero sign-up, or create a free account to customize sessions with your resume and track progress over time.
            </p>

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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#111827] hover:bg-[#1E293B] text-[#F8FAFC] text-sm font-semibold border border-[#334155] hover:border-cyan-400/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <PlayCircle className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                <span>{startingDemo ? 'Launching Instant Demo...' : 'Try Instant Demo'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
