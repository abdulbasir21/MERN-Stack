'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminAuditLogsApi } from '@/lib/api';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminAuditLogsApi({ page, pageSize: 25 });
      setLogs(res.data.items);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Immutable Audit Stream</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Read-only cryptographic audit record of all sensitive administrator operations and system modifications (ADM-8, SEC-1).
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-[#94A3B8]">Loading audit records...</div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs text-center">
          {error}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#111827] border border-[#1E293B] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#94A3B8]">
              <thead className="bg-[#0B0F17] text-[#64748B] uppercase font-mono text-[10px] border-b border-[#1E293B]">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target Type</th>
                  <th className="p-4">Target ID</th>
                  <th className="p-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[#64748B]">
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#151D2F] transition font-mono">
                      <td className="p-4 text-[11px] text-[#94A3B8] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-[11px] text-cyan-400">
                        {log.actorId.slice(0, 10)}...
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#0B0F17] border border-[#1E293B] text-amber-300 font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-[#F8FAFC]">{log.targetType}</td>
                      <td className="p-4 text-[11px] text-[#64748B]">{log.targetId}</td>
                      <td className="p-4 max-w-xs truncate text-[10px] text-[#64748B]">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded bg-[#0B0F17] border border-[#1E293B] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded bg-[#0B0F17] border border-[#1E293B] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
