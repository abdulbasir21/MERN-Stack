'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDemoSessionApi } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [startingDemo, setStartingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleStartDemo = async () => {
    try {
      setStartingDemo(true);
      setDemoError(null);
      await createDemoSessionApi();
      router.push('/dashboard');
    } catch (err: any) {
      setDemoError(err?.message || 'Failed to start instant demo. Please try registering instead.');
    } finally {
      setStartingDemo(false);
    }
  };

  const interviewTypes = [
    {
      title: 'Technical & System Architecture',
      description: 'Deep-dive system design, distributed data models, caching patterns, API protocols, and algorithmic reasoning.',
      badge: 'TECHNICAL',
    },
    {
      title: 'Behavioral & Leadership (STAR)',
      description: 'Structured situational inquiries targeting conflict resolution, cross-functional delivery, ownership, and adaptability.',
      badge: 'BEHAVIORAL',
    },
    {
      title: 'Human Resources & Culture Fit',
      description: 'Career motivations, compensation expectations framing, team dynamics, work philosophy, and values alignment.',
      badge: 'HR',
    },
  ];

  const faqs = [
    {
      q: 'Do you record or store my microphone audio?',
      a: 'Never. Microphone audio is streamed transiently in memory solely to compute speech-to-text transcription and waveform visualization. No audio files or raw voice buffers are ever written to disk or storage.',
    },
    {
      q: 'How does the AI evaluate my answers without bias?',
      a: 'Evaluations follow the STAR methodology (Situation, Task, Action, Result) against factual rubric criteria. Our prompts explicitly instruct the AI to never grade on response length or decorative vocabulary and to avoid score inflation.',
    },
    {
      q: 'What is included in the instant demo?',
      a: 'The demo requires no account creation or credit card. It provides a full 5-minute practice session with the 3D avatar and AI recruiter, plus access to sample coaching reports. Demo accounts expire and purge after 24 hours.',
    },
    {
      q: 'Can I upload my own resume and specific job descriptions?',
      a: 'Yes. Free registered users can upload PDF/DOCX resumes (up to 5 MB) and paste job requirements. Our RAG engine extracts factual competencies strictly partitioned to your account.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] antialiased">
      {/* 1. Header Navigation */}
      <header className="h-16 border-b border-[#1E293B] bg-[#111827]/80 backdrop-blur-md px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 text-xs">
              IP
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#F8FAFC]">
              InterviewPilot
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#94A3B8]">
            <a href="#how-it-works" className="hover:text-[#F8FAFC] transition">How It Works</a>
            <a href="#features" className="hover:text-[#F8FAFC] transition">Features</a>
            <a href="#types" className="hover:text-[#F8FAFC] transition">Interview Types</a>
            <a href="#faq" className="hover:text-[#F8FAFC] transition">FAQ</a>
            <Link href="/privacy" className="hover:text-[#F8FAFC] transition">Privacy</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] px-3 py-1.5 transition"
          >
            Sign In
          </Link>
          <button
            onClick={handleStartDemo}
            disabled={startingDemo}
            className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#283548] text-xs font-semibold text-amber-300 border border-amber-900/40 transition"
          >
            {startingDemo ? 'Launching Demo...' : 'Try Demo'}
          </button>
          <Link
            href="/register"
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition"
          >
            Start Free
          </Link>
        </div>
      </header>

      {demoError && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-6 py-2 text-xs text-amber-200 text-center">
          {demoError}
        </div>
      )}

      {/* 2. Hero Section (PUB-1) */}
      <section className="relative overflow-hidden py-20 lg:py-28 px-6 lg:px-12 border-b border-[#1E293B]">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-xs font-mono text-cyan-400">
            <span>●</span>
            <span>NEXT-GEN EXECUTIVE REHEARSAL PLATFORM</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F8FAFC] leading-tight">
            Practice smarter. Interview with confidence.
          </h1>

          <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            Experience realistic, voice-first job interview simulations powered by an adaptive AI Recruiter avatar, CV-grounded context, dynamic STAR rubric evaluations, and zero audio storage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition transform hover:-translate-y-0.5 text-center"
            >
              Start Free Interview →
            </Link>

            <button
              onClick={handleStartDemo}
              disabled={startingDemo}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#111827] hover:bg-[#151D2F] text-amber-300 text-xs font-semibold border border-amber-900/50 transition text-center"
            >
              {startingDemo ? 'Launching Instant Demo...' : 'Try Instant Demo (No Sign-Up)'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-6 text-[11px] font-mono text-[#64748B]">
            <span>✓ Zero Voice Recording</span>
            <span>•</span>
            <span>✓ Real-Time Adaptive Questions</span>
            <span>•</span>
            <span>✓ Granular STAR Feedback</span>
          </div>
        </div>
      </section>

      {/* 3. Interview Room Cockpit Preview (PUB-1) */}
      <section className="py-16 px-6 lg:px-12 max-w-6xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Live Interview Cockpit
          </h2>
          <h3 className="text-2xl font-bold text-[#F8FAFC]">
            Engineered for High-Pressure Technical Rehearsal
          </h3>
        </div>

        <div className="rounded-2xl bg-[#111827] border border-[#1E293B] p-6 lg:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-[#F8FAFC]">
                LIVE REHEARSAL ROOM: STAFF PLATFORM ARCHITECT
              </span>
            </div>
            <span className="text-xs font-mono text-[#94A3B8]">TIME REMAINING: 12:45</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Recruiter Panel */}
            <div className="p-6 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-cyan-600/20">
                AI
              </div>
              <div>
                <span className="text-xs font-semibold text-[#F8FAFC] block">AI Executive Recruiter</span>
                <span className="text-[11px] text-[#64748B]">Synthesizing question via low-latency TTS</span>
              </div>
              <div className="p-3 rounded-lg bg-[#111827] border border-[#1E293B] text-xs text-[#CBD5E1] italic">
                &ldquo;Explain how you design cache-invalidation strategies in a distributed microservices environment.&rdquo;
              </div>
            </div>

            {/* Candidate Panel */}
            <div className="p-6 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Microphone Status</span>
                <span className="text-emerald-400 font-mono">● LISTENING</span>
              </div>

              {/* Mock Waveform */}
              <div className="h-16 flex items-center justify-center gap-1">
                {[12, 28, 44, 20, 60, 36, 18, 52, 30, 65, 40, 22, 50, 26, 14].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 rounded-full bg-cyan-400 transition-all duration-150"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#64748B]">Push-to-talk / Voice activity detected</span>
                <button
                  disabled
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600/40 text-cyan-200 text-xs font-semibold cursor-not-allowed"
                >
                  Submit Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works (PUB-1) */}
      <section id="how-it-works" className="py-16 px-6 lg:px-12 border-t border-[#1E293B] bg-[#0E1524]/60">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              The 4-Step Rehearsal Engine
            </h2>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">
              From Resume Upload to Executive Debrief
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold">01 / SETUP</span>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Upload or Target</h4>
              <p className="text-xs text-[#94A3B8]">
                Upload your CV or paste a target Job Description. The factual parser extracts competencies without hallucination.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold">02 / CALIBRATE</span>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Configure Session</h4>
              <p className="text-xs text-[#94A3B8]">
                Select difficulty, interview type, and duration. A tailored question plan is dynamically synthesized.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold">03 / SIMULATE</span>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Live Rehearsal</h4>
              <p className="text-xs text-[#94A3B8]">
                Speak aloud to the recruiter avatar. State transitions adapt based on your answer depth and STAR structure.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3">
              <span className="text-xs font-mono text-cyan-400 font-bold">04 / DEBRIEF</span>
              <h4 className="text-sm font-semibold text-[#F8FAFC]">Executive Scorecard</h4>
              <p className="text-xs text-[#94A3B8]">
                Review question audits, skill breakdowns, and personalized study roadmaps to eliminate blind spots.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Supported Interview Types (PUB-1) */}
      <section id="types" className="py-16 px-6 lg:px-12 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Tailored Archetypes
          </h2>
          <h3 className="text-2xl font-bold text-[#F8FAFC]">
            Precision Practice Across Every Interview Format
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {interviewTypes.map((type, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0B0F17] border border-[#1E293B] text-cyan-400">
                  {type.badge}
                </span>
                <h4 className="text-sm font-semibold text-[#F8FAFC]">{type.title}</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{type.description}</p>
              </div>
              <Link
                href="/register"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium pt-2 block"
              >
                Rehearse this track →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQ Section (PUB-1) */}
      <section id="faq" className="py-16 px-6 lg:px-12 border-t border-[#1E293B] bg-[#0E1524]/60">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Frequently Asked Questions
            </h2>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">
              Transparency on Technology &amp; Candidate Data
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-[#111827] border border-[#1E293B] space-y-2">
                <h4 className="text-sm font-semibold text-[#F8FAFC]">{faq.q}</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Footer (PUB-1) */}
      <footer className="py-12 px-6 lg:px-12 border-t border-[#1E293B] bg-[#0B0F17]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-[10px]">
              IP
            </div>
            <span className="font-semibold text-[#F8FAFC]">InterviewPilot</span>
            <span>— Executive AI Mock Interview Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/privacy" className="hover:text-[#F8FAFC] transition">Privacy &amp; Data Retention</Link>
            <Link href="/login" className="hover:text-[#F8FAFC] transition">Sign In</Link>
            <Link href="/register" className="hover:text-[#F8FAFC] transition">Register</Link>
            <Link href="/dashboard" className="hover:text-[#F8FAFC] transition">Candidate Portal</Link>
            <Link href="/admin" className="hover:text-[#F8FAFC] transition">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
