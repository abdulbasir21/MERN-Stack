'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchAdminOverviewApi, resetAdminDemoDataApi, type AdminOverviewData } from '@/lib/api';

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminOverviewApi();
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin overview metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleResetDemoData = async () => {
    if (!window.confirm('Are you sure you want to delete all demo users, sessions, and demo interviews?')) {
      return;
    }
    try {
      setResettingDemo(true);
      const res = await resetAdminDemoDataApi();
      setResetMessage(`Successfully purged ${res.data.deletedDemoUsersCount} demo user(s).`);
      loadMetrics();
    } catch (err: any) {
      setResetMessage(`Failed to reset demo data: ${err?.message || 'Unknown error'}`);
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">System Overview &amp; Health</h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Real-time platform metrics derived from database records and AI token tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDemoData}
            disabled={resettingDemo}
            className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#283548] text-xs font-semibold text-amber-300 border border-amber-900/40 transition"
          >
            {resettingDemo ? 'Purging Demo Users...' : 'Reset Demo Data (DEM-6)'}
          </button>
          <button
            onClick={loadMetrics}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition shadow-md shadow-cyan-600/20"
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      {resetMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300">
          {resetMessage}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-[#94A3B8]">Loading system metrics...</div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs text-center">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
              <span className="text-xs text-[#94A3B8] font-medium">Registered Users</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#F8FAFC]">{data.totalRegisteredUsers}</span>
                <span className="text-xs text-[#64748B]">permanent</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                Active (last 7d): <strong className="text-cyan-400">{data.activeUsers7d}</strong>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
              <span className="text-xs text-[#94A3B8] font-medium">Active Demo Sessions</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-400">{data.activeDemoSessions}</span>
                <span className="text-xs text-[#64748B]">ephemeral</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                Unexpired sessions
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
              <span className="text-xs text-[#94A3B8] font-medium">Interviews Conducted</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#F8FAFC]">
                  {data.interviews.realTotal + data.interviews.demoTotal}
                </span>
                <span className="text-xs text-[#64748B]">total</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B] flex justify-between">
                <span>Real today: <strong className="text-[#F8FAFC]">{data.interviews.realToday}</strong></span>
                <span>Demo today: <strong className="text-amber-400">{data.interviews.demoToday}</strong></span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
              <span className="text-xs text-[#94A3B8] font-medium">Uploaded Documents</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#F8FAFC]">{data.uploadedDocumentsTotal}</span>
                <span className="text-xs text-[#64748B]">files</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1E293B] text-[11px] text-[#64748B]">
                Private storage
              </div>
            </div>
          </div>

          {/* AI Global Budget Card (QTA-4, ADM-2) */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">Monthly Global AI Budget ({data.budget.period})</h3>
                <p className="text-xs text-[#94A3B8]">
                  Enforces atomic conditional quota reservations. Fail-closed on exhaustion.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${data.budget.aiEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-mono font-semibold text-[#F8FAFC]">
                  {data.budget.aiEnabled ? 'AI Engine: ACTIVE' : 'AI Engine: HALTED'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                <span className="text-[10px] font-mono text-[#64748B] uppercase">Total Budget</span>
                <div className="text-base font-bold text-[#F8FAFC] font-mono mt-0.5">
                  ${data.budget.totalBudgetUsd}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                <span className="text-[10px] font-mono text-[#64748B] uppercase">Used</span>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                  ${data.budget.usedUsd}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                <span className="text-[10px] font-mono text-[#64748B] uppercase">In-Flight Reserved</span>
                <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
                  ${data.budget.reservedUsd}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                <span className="text-[10px] font-mono text-[#64748B] uppercase">Remaining</span>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                  ${data.budget.remainingUsd}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Management Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/users"
              className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/50 transition group"
            >
              <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-cyan-400 transition">
                User Management →
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Search, inspect activity, block/unblock accounts, or execute 3-step account deletions.
              </p>
            </Link>

            <Link
              href="/admin/settings"
              className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/50 transition group"
            >
              <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-cyan-400 transition">
                System Settings →
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Edit range-validated quotas, global budget caps, and demo restrictions with full audit diffs.
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-cyan-500/50 transition group"
            >
              <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-cyan-400 transition">
                Audit Log Stream →
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Read-only immutable record of all administrator actions, document accesses, and state changes.
              </p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
