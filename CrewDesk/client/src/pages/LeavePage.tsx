import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  AlertCircle,
  X,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Calendar,
  HeartPulse,
  Coffee,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Weekday calculation helper (Monday to Friday)
function calculateClientWeekdays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(`${startStr}T00:00:00.000Z`);
  const end = new Date(`${endStr}T00:00:00.000Z`);
  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isApprover = user?.role === 'HR_MANAGER' || user?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState<'my' | 'queue'>(isApprover ? 'queue' : 'my');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Request form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);

  // Reject modal state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Expanded task preview in approval queue
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);

  // 1. Fetch My Balances
  const { data: balancesData, isLoading: isBalancesLoading } = useQuery({
    queryKey: ['leave', 'my-balances'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/leave/my-balances`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load balances');
      return res.json();
    },
  });

  // 2. Fetch My Leave Requests
  const { data: myRequestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['leave', 'my-requests'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/leave/my-requests`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load requests');
      return res.json();
    },
  });

  // 3. Fetch Approval Queue (HR/Owner)
  const { data: queueData, isLoading: isQueueLoading } = useQuery({
    queryKey: ['leave', 'approval-queue'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/leave/approval-queue`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load approval queue');
      return res.json();
    },
    enabled: isApprover,
  });

  // Request Mutation
  const requestMutation = useMutation({
    mutationFn: async () => {
      setRequestError(null);
      const res = await fetch(`${API_BASE}/leave/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leaveTypeId, startDate, endDate, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to submit request');
      return data;
    },
    onSuccess: () => {
      setIsRequestModalOpen(false);
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
    onError: (err: any) => {
      setRequestError(err.message);
    },
  });

  // Cancel Request Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/leave/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/leave/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Approval failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      setRejectError(null);
      const res = await fetch(`${API_BASE}/leave/${rejectingRequestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decisionReason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Rejection failed');
      return data;
    },
    onSuccess: () => {
      setRejectingRequestId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
    onError: (err: any) => {
      setRejectError(err.message);
    },
  });

  const balances = balancesData?.data || [];
  const myRequests = myRequestsData?.data || [];
  const queue = queueData?.data || [];
  const estimatedDays = calculateClientWeekdays(startDate, endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Leave Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track annual, sick and casual leave allowances, submitted requests and approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isApprover && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors relative ${
                  activeTab === 'queue'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Approvals Queue
                {queue.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
                    {queue.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'my'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                My Leaves
              </button>
            </div>
          )}

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Request Leave
          </button>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isBalancesLoading ? (
          <div className="col-span-3 text-center py-6 text-sm text-slate-400">Loading leave balances...</div>
        ) : (
          balances.map((b: any) => {
            const getLeaveIcon = (name: string) => {
              const lower = (name || '').toLowerCase();
              if (lower.includes('sick')) return { icon: HeartPulse, color: 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-800/40 dark:text-rose-400' };
              if (lower.includes('annual')) return { icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:border-blue-800/40 dark:text-blue-400' };
              return { icon: Coffee, color: 'text-teal-600 bg-teal-50 border-teal-100 dark:bg-teal-950/40 dark:border-teal-800/40 dark:text-teal-400' };
            };
            const { icon: Icon, color: badgeColor } = getLeaveIcon(b.leaveType?.name);

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
                    {b.leaveType?.name} LEAVE
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${badgeColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {b.remaining}
                  </span>
                  <span className="text-xs font-medium text-slate-500">days remaining</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <div>
                    <span className="block text-slate-400">Allowance</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{b.allowance}d</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Used</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{b.used}d</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Pending</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{b.pending}d</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* APPROVAL QUEUE TAB (HR / OWNER) */}
      {isApprover && activeTab === 'queue' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pending Leave Requests</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review team member requests with preview of their active assigned tasks and project deadlines.
            </p>
          </div>

          {isQueueLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading approval queue...</div>
          ) : queue.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span>All clear! No pending leave requests to review.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {queue.map((req: any) => {
                const isExpanded = expandedPreviewId === req.id;
                const tasks = req.user?.assignedTasks || [];

                return (
                  <div key={req.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{req.user?.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {req.user?.role}
                          </span>
                          <span className="text-xs text-slate-400">{req.user?.department?.name || 'No Dept'}</span>
                        </div>

                        <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {req.leaveType?.name}
                          </span>
                          <span>
                            {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}
                          </span>
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            ({req.daysCount} working days)
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded">
                          "{req.reason}"
                        </p>
                      </div>

                      {/* Decision buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                        <button
                          onClick={() => approveMutation.mutate(req.id)}
                          disabled={approveMutation.isPending}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingRequestId(req.id);
                            setRejectReason('');
                            setRejectError(null);
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Operational Task Preview Toggle */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setExpandedPreviewId(isExpanded ? null : req.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Active Assigned Tasks ({tasks.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                          {tasks.length === 0 ? (
                            <span className="text-slate-400 italic">No active tasks assigned in this period.</span>
                          ) : (
                            tasks.map((t: any) => (
                              <div key={t.id} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <div>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{t.title}</span>
                                  <span className="text-[11px] text-slate-400 ml-1.5">({t.project?.name})</span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Due: {new Date(t.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MY LEAVE REQUESTS */}
      {(!isApprover || activeTab === 'my') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">My Request History</h3>
          </div>

          {isRequestsLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading request history...</div>
          ) : myRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">You have not submitted any leave requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {myRequests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{req.leaveType?.name}</td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(req.startDate).toLocaleDateString()} &rarr; {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{req.daysCount}d</td>
                      <td className="px-4 py-3">
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                        {req.status === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{req.reason}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {req.decisionReason ? (
                          <span className="text-red-500 italic font-normal">"{req.decisionReason}"</span>
                        ) : req.decidedBy ? (
                          <span>By {req.decidedBy.name}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => cancelMutation.mutate(req.id)}
                            disabled={cancelMutation.isPending}
                            className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBMIT LEAVE REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Leave Request</h3>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">-- Select leave type --</option>
                  {balances.map((b: any) => (
                    <option key={b.leaveTypeId} value={b.leaveTypeId}>
                      {b.leaveType?.name} ({b.remaining} days available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Calculated Weekdays (Mon–Fri):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{estimatedDays} days</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for requesting time off..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending || !leaveTypeId || !startDate || !endDate || estimatedDays <= 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Reject Leave Request</h3>
              <button
                onClick={() => setRejectingRequestId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rejectError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                {rejectError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection (Mandatory)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="State why this leave request cannot be approved at this time..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRejectingRequestId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
