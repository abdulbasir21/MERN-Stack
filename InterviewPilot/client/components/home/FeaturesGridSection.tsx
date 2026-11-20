'use client';

import React from 'react';
import {
  Award,
  FileSearch,
  Mic,
  ShieldCheck,
  BookOpen,
  TrendingUp,
} from 'lucide-react';

const DELIVERABLES = [
  {
    icon: Award,
    title: 'Structured STAR Scorecard',
    description:
      'Every spoken answer is evaluated across Situation, Task, Action, and Result rubrics—never graded on filler or word count.',
  },
  {
    icon: FileSearch,
    title: 'CV-Grounded Questioning',
    description:
      'Questions reference verified facts from your uploaded resume and job description so rehearsal stays relevant.',
  },
  {
    icon: Mic,
    title: 'Voice-First Avatar Room',
    description:
      'Practice speaking aloud with an animated 3D AI Recruiter avatar, live microphone feedback, and question replay.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy-First (Zero Audio Storage)',
    description:
      'Voice buffers stay strictly transient in memory for transcription and lip-sync. Audio files are never written or archived.',
  },
  {
    icon: BookOpen,
    title: 'Personalized Study Roadmap',
    description:
      'Turn missed technical concepts and weak framing into clear study topics and model answer comparisons after each run.',
  },
  {
    icon: TrendingUp,
    title: 'History & Skill Comparisons',
    description:
      'Review chronological score progress and compare competencies across past rehearsal sessions.',
  },
];

export function FeaturesGridSection() {
  return (
    <section
      id="features"
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1E293B]"
    >
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-semibold">
            What You Get
          </p>
          <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Focused tools that sharpen real interview answers
          </h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Built around realistic voice pacing, transparent rubrics, and strict candidate data isolation.
          </p>
        </div>

        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {DELIVERABLES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-200 space-y-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-sans text-base font-semibold text-[#F8FAFC]">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  {feature.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
