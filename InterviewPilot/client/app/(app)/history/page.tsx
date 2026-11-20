'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchInterviewHistoryApi,
  fetchInterviewProgressApi,
  compareInterviewsApi,
  type HistoryListDto,
} from '@/lib/api';
import { AppNavbar } from '@/components/navigation/AppNavbar';

export default function HistoryPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<HistoryListDto | null>(null);
  const [progressData, setProgressData] = useState<Array<{ id: string; date: string; role: string; type: string; overallScore: number | null }>>([]);
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Comparison State (RPT-7)
  const [compareAId, setCompareAId] = useState<string>('');
  const [compareBId, setCompareBId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [histRes, progRes] = await Promise.all([
        fetchInterviewHistoryApi({
          role: roleSearch || undefined,
          type: typeFilter || undefined,
          page,
          pageSize: 20,
        }),
        fetchInterviewProgressApi(),
      ]);

      setHistoryData(histRes.data);
      setProgressData(progRes.data.progress || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roleSearch, typeFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompare = async () => {
    if (!compareAId || !compareBId || compareAId === compareBId) return;
    setComparing(true);
    try {
      const res = await compareInterviewsApi(compareAId, compareBId);
      setComparisonResult(res.data);
    } catch {
      // ignore
    } finally {
      setComparing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] antialiased">
      {/* Top Header */}
      <AppNavbar activeHref="/history" badgeText="History & Progress" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F8FAFC] mb-2">
            Historical Performance &amp; Trends
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Review all completed interview sessions, examine score progressions, and compare skill matrices.
          </p>
        </div>

        {/* PROGRESS TRACKING SECTION (RPT-7) */}
        {progressData.length > 0 && (
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">Performance Trajectory</h3>
                <p className="text-xs text-[#94A3B8]">Chronological score trend across completed sessions</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {progressData.length} Completed Sessions
              </span>
            </div>

            {/* Score trend pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {progressData.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] mb-1">
                    <span>#{idx + 1}</span>
                    <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-cyan-400 my-1">
                    {item.overallScore ?? 'N/A'}<span className="text-[10px] font-normal text-[#64748B]">/100</span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] truncate">{item.role}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SKILL COMPARISON TOOL (RPT-7) */}
        {progressData.length >= 2 && (
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#F8FAFC]">Side-by-Side Skill Comparison</h3>
              <p className="text-xs text-[#94A3B8]">Select two interview sessions to inspect differential skill gains</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] block mb-1">
                  Baseline Session (A)
                </label>
                <select
                  value={compareAId}
                  onChange={(e) => setCompareAId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-xs text-[#F8FAFC] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select Interview A</option>
                  {progressData.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.role} — {new Date(p.date).toLocaleDateString()} ({p.overallScore ?? 'N/A'}/100)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] block mb-1">
                  Target Session (B)
                </label>
                <select
                  value={compareBId}
                  onChange={(e) => setCompareBId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-xs text-[#F8FAFC] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select Interview B</option>
                  {progressData.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.role} — {new Date(p.date).toLocaleDateString()} ({p.overallScore ?? 'N/A'}/100)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCompare}
                disabled={!compareAId || !compareBId || compareAId === compareBId || comparing}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition shadow-lg shadow-blue-600/20"
              >
                {comparing ? 'Comparing...' : 'Compare Sessions'}
              </button>
            </div>

            {/* Comparison Results Table */}
            {comparisonResult && (
              <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0F17] text-[#64748B] uppercase font-mono text-[10px] tracking-wider border-b border-[#1E293B]">
                    <tr>
                      <th className="py-3 px-4">Evaluation Criterion</th>
                      <th className="py-3 px-4">Session A Score</th>
                      <th className="py-3 px-4">Session B Score</th>
                      <th className="py-3 px-4">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {Object.entries(comparisonResult.comparison).map(([skill, comp]: [string, any]) => (
                      <tr key={skill} className="hover:bg-[#1E293B]/30 transition">
                        <td className="py-3 px-4 font-medium text-[#F8FAFC]">{skill}</td>
                        <td className="py-3 px-4 font-mono">{comp.scoreA !== null ? `${comp.scoreA}/100` : '—'}</td>
                        <td className="py-3 px-4 font-mono">{comp.scoreB !== null ? `${comp.scoreB}/100` : '—'}</td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {comp.diff !== null ? (
                            <span className={comp.diff > 0 ? 'text-emerald-400' : comp.diff < 0 ? 'text-rose-400' : 'text-[#94A3B8]'}>
                              {comp.diff > 0 ? `+${comp.diff}` : comp.diff}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* HISTORY FILTERS & LIST (RPT-6) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Role search */}
              <input
                type="text"
                placeholder="Search by role title..."
                value={roleSearch}
                onChange={(e) => {
                  setRoleSearch(e.target.value);
                  setPage(1);
                }}
                className="py-2 px-3.5 rounded-xl bg-[#111827] border border-[#1E293B] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-cyan-500 w-full sm:w-64"
              />

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="py-2 px-3 rounded-xl bg-[#111827] border border-[#1E293B] text-xs text-[#F8FAFC] focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
              >
                <option value="">All Types</option>
                <option value="TECHNICAL">Technical</option>
                <option value="HR">HR / General</option>
                <option value="BEHAVIORAL">Behavioral</option>
              </select>
            </div>

            {historyData && (
              <span className="text-xs text-[#64748B] font-mono">
                Showing {historyData.items.length} of {historyData.total} sessions
              </span>
            )}
          </div>

          {/* History Table */}
          <div className="overflow-x-auto rounded-2xl bg-[#111827] border border-[#1E293B] shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F17] text-[#64748B] uppercase font-mono text-[10px] tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="py-3.5 px-5">Role &amp; Details</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Overall Score</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748B]">
                      Loading interview sessions...
                    </td>
                  </tr>
                ) : historyData && historyData.items.length > 0 ? (
                  historyData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1E293B]/40 transition">
                      <td className="py-4 px-5">
                        <span className="font-semibold text-[#F8FAFC] block">{item.role}</span>
                        <span className="text-[10px] font-mono text-[#64748B]">ID: {item.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs text-[#94A3B8]">{item.type}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-[#94A3B8]">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-[#94A3B8]">
                        {formatDuration(item.durationSeconds)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold">
                        {item.overallScore !== null ? (
                          <span className={item.overallScore >= 75 ? 'text-emerald-400' : item.overallScore >= 50 ? 'text-cyan-400' : 'text-amber-400'}>
                            {item.overallScore}/100
                          </span>
                        ) : (
                          <span className="text-[#64748B] font-normal">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[#0B0F17] text-[#94A3B8] border border-[#1E293B]">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/interviews/${item.id}/report`}
                          className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-cyan-400 transition"
                        >
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748B]">
                      No interview sessions found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {historyData && historyData.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#64748B] font-mono">
                Page {historyData.page} of {historyData.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={historyData.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E293B] text-xs font-medium text-[#F8FAFC] transition"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={historyData.page >= historyData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E293B] text-xs font-medium text-[#F8FAFC] transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
