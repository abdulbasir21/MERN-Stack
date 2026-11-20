'use client';

import React from 'react';
import Link from 'next/link';
import { Code2, Users, Briefcase, ArrowRight, Check } from 'lucide-react';

const INTERVIEW_TRACKS = [
  {
    icon: Code2,
    badge: 'TECHNICAL',
    title: 'Technical & System Design',
    description:
      'Explain architecture decisions, data modeling, debugging steps, and core engineering trade-offs aloud.',
    topics: [
      'API contracts, caching & database indexing',
      'Distributed bottlenecks & error recovery',
      'Clean code & algorithmic reasoning',
    ],
  },
  {
    icon: Users,
    badge: 'BEHAVIORAL',
    title: 'Behavioral & Leadership (STAR)',
    description:
      'Practice concise, high-signal storytelling around teamwork, ownership, conflict, and ambiguity.',
    topics: [
      'Cross-functional alignment under deadlines',
      'Handling production mistakes & feedback',
      'Initiative, mentoring & project ownership',
    ],
  },
  {
    icon: Briefcase,
    badge: 'HR & FIT',
    title: 'Human Resources & Role Fit',
    description:
      'Rehearse career narrative framing, role motivations, teamwork preferences, and closing questions.',
    topics: [
      'Career motivation & target role pitch',
      'Communication clarity & culture alignment',
      'Compensation expectations & growth goals',
    ],
  },
];

export function InterviewTypesSection() {
  return (
    <section
      id="types"
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1E293B] bg-[#0E1524]/60"
    >
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-semibold">
            Supported Interview Tracks
          </p>
          <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Precision practice across every interview round
          </h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Switch tracks between sessions to prepare for phone screens, behavioral loops, or deep technical panels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INTERVIEW_TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.badge}
                className="group p-6 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-400/50 hover:shadow-[0_0_32px_-10px_rgba(6,182,212,0.3)] transition-all duration-200 flex flex-col justify-between gap-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#0B0F17] border border-[#334155] text-cyan-300">
                      {track.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-sans text-lg font-semibold text-[#F8FAFC]">
                      {track.title}
                    </h3>
                    <p className="text-sm text-[#CBD5E1] leading-relaxed">
                      {track.description}
                    </p>
                  </div>

                  <ul
                    role="list"
                    className="space-y-2 pt-2 border-t border-[#1E293B]"
                  >
                    {track.topics.map((topic) => (
                      <li
                        key={topic}
                        className="flex items-start gap-2 text-xs sm:text-sm text-[#CBD5E1]"
                      >
                        <Check
                          className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                >
                  <span>Rehearse this track</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
