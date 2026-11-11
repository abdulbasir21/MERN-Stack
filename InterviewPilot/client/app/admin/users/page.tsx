'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminUsersApi,
  updateAdminUserStatusApi,
  deleteAdminUserApi,
} from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminUsersApi({ search: search || undefined, page, pageSize: 20 });
      setUsers(res.data.items);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch users list.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleBlock = async (userId: string, currentStatus: string) => {
    const willBlock = currentStatus !== 'BLOCKED';
    if (!window.confirm(`Are you sure you want to ${willBlock ? 'BLOCK' : 'UNBLOCK'} this user?`)) {
      return;
    }
    try {
      await updateAdminUserStatusApi(userId, willBlock);
      setActionMessage(`User status updated to ${willBlock ? 'BLOCKED' : 'ACTIVE'}.`);
      loadUsers();
    } catch (err: any) {
      setActionMessage(`Failed to update status: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user ${email}? This cascades all data.`)) {
      return;
    }
    try {
      await deleteAdminUserApi(userId);
      setActionMessage(`User ${email} successfully deleted.`);
      loadUsers();
    } catch (err: any) {
      setActionMessage(`Failed to delete user: ${err?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">User Directory</h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Manage candidates, view interview activity, enforce access blocks, and audit user records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-[#111827] border border-[#1E293B] rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-cyan-500 w-64"
          />
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-[#94A3B8]">Loading user directory...</div>
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
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Interviews</th>
                  <th className="p-4">Docs</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[#64748B]">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#151D2F] transition">
                      <td className="p-4">
                        <div className="font-semibold text-[#F8FAFC]">{u.fullName || '—'}</div>
                        <div className="text-[11px] font-mono text-[#64748B]">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          u.role === 'ADMIN' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' : 'bg-[#0B0F17] text-[#94A3B8]'
                        }`}>
                          {u.role}
                        </span>
                        {u.isDemo && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-950 text-blue-400">
                            DEMO
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          u.status === 'ACTIVE'
                            ? 'text-emerald-400'
                            : u.status === 'BLOCKED'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}>
                          ● {u.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[#F8FAFC]">{u.interviewsCount}</td>
                      <td className="p-4 font-mono text-[#F8FAFC]">{u.documentsCount}</td>
                      <td className="p-4 text-[11px] font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right space-x-2">
                        {u.role !== 'ADMIN' && (
                          <>
                            <button
                              onClick={() => handleToggleBlock(u.id, u.status)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                                u.status === 'BLOCKED'
                                  ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60'
                                  : 'bg-amber-950/60 text-amber-400 hover:bg-amber-900/60'
                              }`}
                            >
                              {u.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-950/60 text-red-400 hover:bg-red-900/60 transition"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
