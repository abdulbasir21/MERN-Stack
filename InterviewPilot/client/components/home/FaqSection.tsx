'use client';

import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Do you record or store my microphone audio?',
    answer:
      'Never. Microphone audio is streamed transiently in memory solely to compute speech-to-text transcription and live waveform feedback. Audio buffers are discarded immediately and are never written to disk or cloud storage.',
  },
  {
    question: 'How does the AI evaluate my answers fairly?',
    answer:
      'Evaluations follow the structured STAR methodology (Situation, Task, Action, Result) against role-specific technical and behavioral rubrics. Scoring checks factual concepts addressed versus missed concepts—never response length or filler words.',
  },
  {
    question: 'What is included in the instant browser demo?',
    answer:
      'You can launch a 5-minute General Practice session with the 3D AI Recruiter avatar and voice telemetry without creating an account. Demo sessions support up to 3 adaptive questions and automatically expire after 24 hours.',
  },
  {
    question: 'Can I upload my resume and a real job description?',
    answer:
      'Yes. Free registered accounts can upload PDF or DOCX resumes (up to 5 MB) and save target job descriptions. Your documents remain strictly private to your account and ground every generated interview question.',
  },
  {
    question: 'Is InterviewPilot only for senior or executive roles?',
    answer:
      'No. You can configure seniority to Beginner, Intermediate, or Experienced across Technical, Behavioral, and HR tracks—whether you are preparing for a first internship or a senior architecture round.',
  },
];

export function FaqSection() {
  const baseId = useId();
  const [openIndices, setOpenIndices] = useState<number[]>(() => [0]);

  const toggleItem = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  return (
    <section
      id="faq"
      aria-labelledby={`${baseId}-heading`}
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1E293B]"
    >
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-semibold">
            Frequently Asked Questions
          </p>
          <h2
            id={`${baseId}-heading`}
            className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]"
          >
            Clarity on privacy, scoring, and practice sessions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndices.includes(idx);
            const buttonId = `${baseId}-faq-btn-${idx}`;
            const panelId = `${baseId}-faq-panel-${idx}`;

            return (
              <div
                key={faq.question}
                className={`rounded-2xl border transition-colors ${
                  isOpen
                    ? 'bg-[#111827] border-cyan-500/40'
                    : 'bg-[#111827]/70 border-[#1E293B] hover:border-[#334155]'
                }`}
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(idx)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between gap-4 rounded-2xl text-sm sm:text-base font-semibold text-[#F8FAFC]"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-cyan-300 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                    isOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 invisible'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 sm:px-6 pb-5 text-sm text-[#CBD5E1] leading-relaxed border-t border-[#1E293B]/70 pt-3.5">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
