'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchUserDashboardApi, type UserDashboardData } from '@/lib/api';
import { FadeIn, CardHover } from '@/components/animations/MotionWrappers';
import { AppNavbar } from '@/components/navigation/AppNavbar';

export default function CandidateDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchUserDashboardApi();
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] antialiased">
      {/* Top Header Bar */}
      <AppNavbar activeHref="/dashboard" />

      {/* Demo Warning Banner if ephemeral demo user (DEM-4, DEM-5) */}
      {data?.isDemo && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            <span>
              <strong>Demo Session Preview:</strong> 1 interview/day, 5-minute cap, GENERAL mode only. Document uploads are restricted.
            </span>
          </div>
          <Link
            href="/register"
            className="text-amber-300 hover:text-white font-semibold underline underline-offset-4 whitespace-nowrap"
          >
            Create Permanent Account →
          </Link>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] via-[#151D2F] to-[#0E1524] border border-[#1E293B] p-5 sm:p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-[11px] font-mono text-cyan-400">
                <span>●</span>
                <span>AI EXECUTIVE COACH ENGINE</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F8FAFC]">
                Welcome back. Your interview readiness is live.
              </h1>
              <p className="text-sm text-[#94A3B8]">
                Practice with real-time adaptive questioning, speech synthesis, and granular STAR scoring.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Link
                href="/interviews/setup"
                className="flex-1 sm:flex-initial text-center px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-cyan-600/30 transition transform hover:-translate-y-0.5"
              >
                Start New Interview
              </Link>
              <Link
                href="/history"
                className="flex-1 sm:flex-initial text-center px-4 py-3 rounded-xl bg-[#1E293B] hover:bg-[#283548] text-[#F8FAFC] font-semibold text-xs transition"
              >
                View History
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="p-16 text-center text-sm text-[#94A3B8]">
            Loading candidate intelligence metrics...
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-950/20 border border-red-800/40 text-red-300 text-xs text-center">
            {error}
          </div>
        ) : data ? (
          <FadeIn className="space-y-8">
            {/* Stat Cards Grid (RPT-8: Zero AI calls, computed numbers) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Practice Sessions */}
              <CardHover className="h-full">
                <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between h-full">
                  <span className="text-xs font-medium text-[#94A3B8]">Total Practice Sessions</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#F8FAFC]">
                      {data.statistics.totalInterviews}
                    </span>
                    <span className="text-xs text-[#64748B]">interviews</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                    All recorded attempts
                  </div>
                </div>
              </CardHover>

              {/* Completed Interviews */}
              <CardHover className="h-full">
                <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between h-full">
                  <span className="text-xs font-medium text-[#94A3B8]">Completed Sessions</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-cyan-400">
                      {data.statistics.completedInterviews}
                    </span>
                    <span className="text-xs text-[#64748B]">finished</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                    Evaluations generated
                  </div>
                </div>
              </CardHover>

              {/* Average Score */}
              <CardHover className="h-full">
                <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between h-full">
                  <span className="text-xs font-medium text-[#94A3B8]">Average Overall Score</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#F8FAFC]">
                      {data.statistics.averageScore !== null ? `${data.statistics.averageScore}%` : '—'}
                    </span>
                    <span className="text-xs text-[#64748B]">/ 100</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                    Across completed sessions
                  </div>
                </div>
              </CardHover>

              {/* Recent Trend */}
              <CardHover className="h-full">
                <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between h-full">
                  <span className="text-xs font-medium text-[#94A3B8]">Recent Score Trend</span>
                  <div className="mt-4 flex items-center gap-1.5 overflow-x-auto py-1">
                    {data.statistics.recentTrend.length > 0 ? (
                      data.statistics.recentTrend.map((score, i) => (
                        <div
                          key={i}
                          className="px-2 py-1 rounded-md bg-[#0B0F17] border border-[#1E293B] text-[11px] font-mono text-cyan-400 font-semibold"
                          title={`Session ${i + 1}: ${score}%`}
                        >
                          {score}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[#64748B]">No completed sessions yet</span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                    Last 10 sessions (oldest to newest)
                  </div>
                </div>
              </CardHover>
            </section>

            {/* Bento Layout: Recent Interviews & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Interviews (2 columns on large screen) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#F8FAFC]">Recent Practice Sessions</h2>
                  <Link
                    href="/history"
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    View All →
                  </Link>
                </div>

                <div className="rounded-2xl bg-[#111827] border border-[#1E293B] divide-y divide-[#1E293B] overflow-hidden">
                  {data.recentInterviews.length === 0 ? (
                    <div className="p-12 text-center text-xs text-[#94A3B8]">
                      No mock interviews found. Start your first session now!
                    </div>
                  ) : (
                    data.recentInterviews.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#151D2F] transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#F8FAFC]">
                              {inv.role}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#0B0F17] border border-[#1E293B] text-[10px] font-mono text-cyan-400">
                              {inv.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#64748B]">
                            <span>{new Date(inv.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{formatDuration(inv.durationSeconds)}</span>
                            <span>•</span>
                            <span className="capitalize">{inv.status.toLowerCase()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-[#94A3B8] block">Overall Score</span>
                            <span className="text-sm font-bold font-mono text-cyan-400">
                              {inv.overallScore !== null ? `${inv.overallScore}%` : '—'}
                            </span>
                          </div>

                          <Link
                            href={
                              inv.hasReport
                                ? `/interviews/${inv.id}/report`
                                : inv.status === 'IN_PROGRESS'
                                ? `/interviews/${inv.id}/room`
                                : `/interviews/${inv.id}/report`
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#283548] text-xs font-semibold text-[#F8FAFC] transition"
                          >
                            {inv.hasReport ? 'View Report' : inv.status === 'IN_PROGRESS' ? 'Resume' : 'Details'}
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommendations Box (from latest saved report) */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-[#F8FAFC]">Executive Coaching Digest</h2>
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-5">
                  {data.recommendations ? (
                    <>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-1">
                          Latest Performance Summary
                        </span>
                        <p className="text-xs text-[#CBD5E1] leading-relaxed">
                          {data.recommendations.summary}
                        </p>
                      </div>

                      {data.recommendations.strengths.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1.5">
                            Key Strengths
                          </span>
                          <ul className="space-y-1">
                            {data.recommendations.strengths.slice(0, 3).map((st, i) => (
                              <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                                <span className="text-emerald-400">✓</span>
                                <span>{st}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {data.recommendations.weaknesses.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold block mb-1.5">
                            Focus Areas
                          </span>
                          <ul className="space-y-1">
                            {data.recommendations.weaknesses.slice(0, 3).map((wk, i) => (
                              <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                                <span className="text-amber-400">!</span>
                                <span>{wk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {data.recommendations.studyTopics.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold block mb-1.5">
                            Recommended Study Topics
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {data.recommendations.studyTopics.map((tp, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-[#0B0F17] border border-[#1E293B] text-[10px] text-blue-300 font-mono"
                              >
                                {tp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-xs text-[#94A3B8]">
                        Complete your first mock interview to generate personalized AI coaching recommendations and study roadmaps.
                      </p>
                      <Link
                        href="/interviews/setup"
                        className="inline-block mt-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                      >
                        Start First Session
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>
        ) : null}
      </main>
    </div>
  );
}
