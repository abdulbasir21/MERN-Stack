'use client';

import React from 'react';
import {
  FileText,
  SlidersHorizontal,
  Mic,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const STEPS = [
  {
    number: '01',
    label: 'SETUP',
    icon: FileText,
    title: 'Upload Resume or JD',
    description:
      'Add your PDF/DOCX CV or paste a target job description. Facts stay strictly partitioned to your private session.',
  },
  {
    number: '02',
    label: 'CALIBRATE',
    icon: SlidersHorizontal,
    title: 'Configure Your Track',
    description:
      'Pick your target role, seniority (Beginner, Intermediate, or Experienced), category, and duration.',
  },
  {
    number: '03',
    label: 'SIMULATE',
    icon: Mic,
    title: 'Speak with the Avatar',
    description:
      'Answer questions aloud with the AI Recruiter avatar. Ask clarifying questions whenever you need scope details.',
  },
  {
    number: '04',
    label: 'DEBRIEF',
    icon: BarChart3,
    title: 'Review STAR Debrief',
    description:
      'Inspect per-question strengths, missing technical concepts, ideal answer framing, and targeted study topics.',
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1E293B] bg-[#0E1524]/60"
    >
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-semibold">
            How It Works
          </p>
          <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Four steps from resume context to actionable feedback
          </h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Designed to mirror real turn-based interview conversations while keeping every coaching rubric transparent.
          </p>
        </div>

        <div className="relative">
          {/* Desktop horizontal connector line */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-11 left-[12%] right-[12%] h-px bg-gradient-to-r from-cyan-500/15 via-cyan-400/50 to-cyan-500/15"
          />

          <ol
            role="list"
            className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.number} className="relative flex">
                  <div className="w-full p-6 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-200 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-sm shadow-cyan-500/10">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-[#1E293B] text-xs font-mono font-bold text-cyan-300">
                        <span>{step.number}</span>
                        <span className="text-[#94A3B8] font-medium">/ {step.label}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-sans text-base font-semibold text-[#F8FAFC]">
                        {step.title}
                      </h3>
                      <p className="text-sm text-[#CBD5E1] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Step connector arrow between desktop cards */}
                  {index < STEPS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden lg:flex items-center justify-center absolute -right-4 top-10 z-10 w-6 h-6 rounded-full bg-[#0B0F17] border border-[#334155] text-cyan-300"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
