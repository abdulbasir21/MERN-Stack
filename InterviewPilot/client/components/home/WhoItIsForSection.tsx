'use client';

import React from 'react';
import { GraduationCap, Sparkles, Compass, Cpu } from 'lucide-react';

const AUDIENCES = [
  {
    icon: GraduationCap,
    stage: 'Early Career',
    title: 'Students & Interns',
    description:
      'Build comfort speaking aloud before campus placements, technical screens, and summer internship interviews.',
  },
  {
    icon: Sparkles,
    stage: 'Entry Level',
    title: 'Fresh Graduates',
    description:
      'Turn class assignments, capstones, and bootcamp projects into structured, memorable STAR interview stories.',
  },
  {
    icon: Compass,
    stage: 'Transitions',
    title: 'Career Switchers',
    description:
      'Bridge transferable experience to your target industry by rehearsing against real job descriptions.',
  },
  {
    icon: Cpu,
    stage: 'Senior & Staff',
    title: 'Experienced Engineers',
    description:
      'Stress-test architecture trade-offs, scalability decisions, and leadership scenarios under realistic pacing.',
  },
];

export function WhoItIsForSection() {
  return (
    <section
      id="who-its-for"
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1E293B]"
    >
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-semibold">
            Who It&apos;s For
          </p>
          <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Built for every stage of your job search
          </h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Configure difficulty and role expectations to match your experience—never one-size-fits-all prompts.
          </p>
        </div>

        <ul
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {AUDIENCES.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono text-[#94A3B8]">
                      {item.stage}
                    </span>
                  </div>
                  <h3 className="font-sans text-base font-semibold text-[#F8FAFC]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
