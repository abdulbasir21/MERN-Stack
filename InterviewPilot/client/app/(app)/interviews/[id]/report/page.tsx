'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchInterviewReportApi,
  generateInterviewReportApi,
  type InterviewReportDto,
} from '@/lib/api';

export default function ComprehensiveReportPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<InterviewReportDto | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetchInterviewReportApi(interviewId);
      setReportData(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Failed to load interview report.');
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await generateInterviewReportApi(interviewId);
      await loadReport();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || 'Failed to generate report narrative.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-[#94A3B8] font-mono tracking-wider uppercase">Loading Assessment Report...</span>
        </div>
      </div>
    );
  }

  if (errorMessage && !reportData) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#111827] border border-rose-500/30 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[#F8FAFC] mb-2">Report Unavailable</h3>
          <p className="text-xs text-[#94A3B8] mb-6">{errorMessage}</p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-[#F8FAFC] transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { interview, metrics, report, questions } = reportData!;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] antialiased">
      {/* Top Header */}
      <header className="h-16 border-b border-[#1E293B] bg-[#111827]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 pr-3 border-r border-[#1E293B] text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition">
            ← Dashboard
          </Link>
          <span className="font-semibold text-sm tracking-tight text-[#F8FAFC]">Performance Assessment Report</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-medium text-[#F8FAFC] transition"
          >
            History &amp; Trends
          </Link>
          <button
            type="button"
            onClick={() => router.push('/interviews/setup')}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-600/20"
          >
            New Interview
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        {/* Session Header Banner */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1E293B]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono uppercase tracking-wider font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                AUDIT COMPLETE
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748B]">
                CONFIDENTIAL EVALUATION
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              {interview.role}
            </h1>
            <p className="text-xs text-[#94A3B8] flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Type: <strong className="text-[#F8FAFC]">{interview.type}</strong></span>
              <span className="text-[#334155]">•</span>
              <span>Level: <strong className="text-[#F8FAFC]">{interview.experienceLevel}</strong></span>
              <span className="text-[#334155]">•</span>
              <span>Duration: <strong className="text-[#F8FAFC]">{formatDuration(metrics.durationSeconds)}</strong></span>
              <span className="text-[#334155]">•</span>
              <span className="text-cyan-400 font-semibold">{metrics.evaluatedAnswersCount} Answers Evaluated</span>
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-xl border border-[#1E293B]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Executive Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'questions'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Question Breakdown ({questions.length})
            </button>
          </div>
        </section>

        {activeTab === 'overview' && (
          <>
            {/* HERO SCORECARD BENTO GRID */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Overall Assessment Score (5 cols) */}
              <div className="lg:col-span-5 bg-[#111827] border border-[#1E293B] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748B]">
                      Overall Performance Index
                    </span>
                    {metrics.overallScore !== null && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                        metrics.overallScore >= 75
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : metrics.overallScore >= 50
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {metrics.overallScore >= 75 ? 'Strong Hire' : metrics.overallScore >= 50 ? 'Competitive' : 'Developing'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 my-2">
                    <span className="text-5xl font-bold font-mono tracking-tight text-[#F8FAFC]">
                      {metrics.overallScore ?? 'N/A'}
                    </span>
                    <span className="text-sm font-mono text-[#64748B]">/ 100</span>
                  </div>

                  {/* Progress Arc */}
                  <div className="w-full bg-[#1E293B] rounded-full h-2 my-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.overallScore || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Report Narrative Summary or Fallback */}
                <div className="p-4 bg-[#0B0F17] rounded-xl border border-[#1E293B] mt-4">
                  {report?.summary ? (
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {report.summary}
                    </p>
                  ) : report?.status === 'PENDING' ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-amber-300">
                        AI report narrative generation is pending. All scores and question evaluations are fully recorded.
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition flex items-center justify-center gap-2"
                      >
                        {isGenerating ? 'Generating Report...' : 'Generate Executive Narrative'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8]">
                      Interview assessment complete. Scores reflect performance across all evaluation criteria.
                    </p>
                  )}
                </div>
              </div>

              {/* Skills Breakdown Grid (7 cols) */}
              <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4 flex items-center justify-between">
                    <span>Competency &amp; Skill Breakdown</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748B]">
                      Calculated on Read (RPT-1)
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(metrics.skillBreakdown).map(([skill, data]) => (
                      <div key={skill} className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[#94A3B8] truncate mr-2">{skill}</span>
                          <span className="text-xs font-bold font-mono text-cyan-400">{data.meanScore}/100</span>
                        </div>
                        <div className="w-full bg-[#1E293B] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-1.5 rounded-full"
                            style={{ width: `${data.meanScore}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Behavioral STAR Coverage if applicable */}
                {metrics.starCoverage && (
                  <div className="mt-6 pt-4 border-t border-[#1E293B]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-[#F8FAFC]">STAR Methodology Coverage</span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        {metrics.starCoverage.totalBehavioralAnswers} Behavioral Answers
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                        <span className="text-[10px] font-mono uppercase text-[#64748B] block">Situation</span>
                        <span className="text-xs font-bold font-mono text-cyan-400">{metrics.starCoverage.situationShare}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                        <span className="text-[10px] font-mono uppercase text-[#64748B] block">Task</span>
                        <span className="text-xs font-bold font-mono text-cyan-400">{metrics.starCoverage.taskShare}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                        <span className="text-[10px] font-mono uppercase text-[#64748B] block">Action</span>
                        <span className="text-xs font-bold font-mono text-cyan-400">{metrics.starCoverage.actionShare}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
                        <span className="text-[10px] font-mono uppercase text-[#64748B] block">Result</span>
                        <span className="text-xs font-bold font-mono text-cyan-400">{metrics.starCoverage.resultShare}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* STRENGTHS & WEAKNESSES BENTO */}
            {report?.status === 'READY' && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">Demonstrated Strengths</h3>
                  </div>
                  <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                    {(report.strengths || []).map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">Areas for Growth</h3>
                  </div>
                  <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                    {(report.weaknesses || []).map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* RECOMMENDATIONS & STUDY TOPICS */}
            {report?.status === 'READY' && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recommendations */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Actionable Recommendations</span>
                  </h3>
                  <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                    {(report.recommendations || []).map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Study Topics */}
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Targeted Study Topics</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(report.studyTopics || []).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-[#0B0F17] border border-[#1E293B] text-xs font-mono text-indigo-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* QUESTION-BY-QUESTION AUDIT BREAKDOWN (RPT-4) */}
        {activeTab === 'questions' && (
          <section className="space-y-6">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#1E293B] text-[#94A3B8] font-mono text-xs font-semibold">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-medium text-[#F8FAFC]">{q.topic}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0B0F17] text-[#64748B]">
                      {q.difficulty}
                    </span>
                  </div>
                  {q.candidateAnswer && (
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      Score: {q.candidateAnswer.score}/100
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block mb-1">
                    Question Prompt
                  </span>
                  <p className="text-sm font-semibold text-[#F8FAFC] leading-relaxed">
                    {q.questionText}
                  </p>
                </div>

                {/* Candidate Answer Transcript */}
                {q.candidateAnswer ? (
                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] space-y-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block mb-1">
                        Spoken Response Transcript
                      </span>
                      <p className="text-xs text-[#94A3B8] leading-relaxed italic">
                        &ldquo;{q.candidateAnswer.transcript || '(No speech recorded)'}&rdquo;
                      </p>
                    </div>

                    {q.candidateAnswer.evaluation && (
                      <div className="pt-3 border-t border-[#1E293B] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {q.candidateAnswer.evaluation.correct && (
                          <div>
                            <span className="font-semibold text-emerald-400 block mb-0.5">Correct Concepts:</span>
                            <p className="text-[#94A3B8]">{q.candidateAnswer.evaluation.correct}</p>
                          </div>
                        )}
                        {q.candidateAnswer.evaluation.missing && (
                          <div>
                            <span className="font-semibold text-rose-400 block mb-0.5">Missing Concepts:</span>
                            <p className="text-[#94A3B8]">{q.candidateAnswer.evaluation.missing}</p>
                          </div>
                        )}
                        {q.candidateAnswer.evaluation.idealAnswer && (
                          <div className="md:col-span-2 p-3 rounded-lg bg-[#111827] border border-[#1E293B]">
                            <span className="font-semibold text-cyan-400 block mb-1">Model Ideal Answer:</span>
                            <p className="text-xs text-[#F8FAFC] leading-relaxed">{q.candidateAnswer.evaluation.idealAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B] italic">No answer submitted for this question.</p>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
